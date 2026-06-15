import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { profileUsesSupabase } from "./runtime-service.js";

const DEMO_DATABASE_PRIVILEGES = [
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "CREATE",
  "DROP",
  "ALTER",
  "INDEX",
  "REFERENCES",
  "CREATE TEMPORARY TABLES",
  "LOCK TABLES",
  "EXECUTE",
  "CREATE VIEW",
  "SHOW VIEW",
  "CREATE ROUTINE",
  "ALTER ROUTINE",
  "TRIGGER"
].join(", ");

export function createDemoDatabaseConfig(config = {}) {
  return {
    enabled: Boolean(config.demoDbEnabled),
    mock: Boolean(config.demoDbMock),
    adminHost: config.demoDbAdminHost || "",
    adminPort: Number(config.demoDbAdminPort || 3306),
    adminUser: config.demoDbAdminUser || "",
    adminPassword: config.demoDbAdminPassword || "",
    host: config.demoDbHost || "172.17.0.1",
    port: Number(config.demoDbPort || 3306)
  };
}

export function needsMysqlDatabase(inspection = {}) {
  const runtime = inspection.runtime || {};
  return Boolean(runtime.requiresMysql || runtime.databaseEngine === "mysql");
}

export function demoDatabaseBlockReason(inspection = {}, config = {}) {
  const runtime = inspection.runtime || {};
  const usesSupabaseExternalBackend = profileUsesSupabase(inspection.projectProfile || {}) || inspection.externalBackend?.provider === "supabase";
  if (runtime.requiresRedis) return "检测到 Redis 依赖。当前 DemoGo 只支持 MySQL 试用数据库，暂不支持 Redis。";
  if (runtime.requiresMongo) return "检测到 MongoDB 依赖。当前 DemoGo 只支持 MySQL 试用数据库，暂不支持 MongoDB。";
  if (runtime.requiresPostgres && !usesSupabaseExternalBackend) return "检测到 PostgreSQL 依赖。当前 DemoGo 只支持 MySQL 试用数据库，暂不支持 PostgreSQL。";
  if (runtime.requiresOtherDatabase && !runtime.requiresMysql && !usesSupabaseExternalBackend) {
    return "检测到暂未支持的数据库依赖。当前 DemoGo 只支持 MySQL 试用数据库。";
  }
  if (needsMysqlDatabase(inspection) && !isDemoDatabaseReady(config)) {
    return "检测到项目需要 MySQL，但当前平台尚未开启 MySQL 试用数据库。";
  }
  return "";
}

export function isDemoDatabaseReady(config = {}) {
  const dbConfig = createDemoDatabaseConfig(config);
  if (!dbConfig.enabled) return false;
  if (dbConfig.mock) return true;
  return Boolean(dbConfig.adminHost && dbConfig.adminUser && dbConfig.adminPassword && dbConfig.host);
}

export async function createDemoDatabase({ slug, demoId = "", inspection = {}, config = {} }) {
  if (!needsMysqlDatabase(inspection)) return null;

  const dbConfig = createDemoDatabaseConfig(config);
  if (!isDemoDatabaseReady(config)) {
    throw createDatabaseError("检测到项目需要 MySQL，但平台试用数据库尚未配置完成。");
  }

  const databaseName = createDatabaseName(slug);
  const userName = createUserName(slug);
  const password = crypto.randomBytes(18).toString("base64url");
  const now = new Date().toISOString();
  const database = {
    enabled: true,
    engine: "mysql",
    databaseName,
    userName,
    status: "ready",
    statusLabel: "已启用",
    host: dbConfig.host,
    port: dbConfig.port,
    createdAt: now,
    deletedAt: null,
    initializedAt: null,
    resetAt: null,
    schema: {
      status: "skipped",
      statusLabel: "未检测到初始化脚本",
      source: "",
      error: "",
      executedAt: null
    },
    demoId: demoId || null,
    env: createDatabaseEnv({ databaseName, userName, password, dbConfig })
  };

  if (dbConfig.mock) {
    return database;
  }

  const connection = await mysql.createConnection({
    host: dbConfig.adminHost,
    port: dbConfig.adminPort,
    user: dbConfig.adminUser,
    password: dbConfig.adminPassword,
    multipleStatements: false
  });
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?`, [userName, password]);
    await connection.query(`ALTER USER ?@'%' IDENTIFIED BY ?`, [userName, password]);
    await connection.query(`GRANT ${DEMO_DATABASE_PRIVILEGES} ON \`${databaseName}\`.* TO ?@'%'`, [userName]);
    return database;
  } catch (error) {
    await cleanupMysqlDatabase(connection, databaseName, userName).catch(() => null);
    throw createDatabaseError(`试用数据库创建失败：${error.message}`);
  } finally {
    await connection.end();
  }
}

export async function initializeDemoDatabase(database, { projectDir = "", config = {} } = {}) {
  const privateDatabase = getPrivateDatabase(database);
  if (!privateDatabase?.enabled || privateDatabase.engine !== "mysql" || privateDatabase.status === "deleted") return privateDatabase;
  const schemaFile = await findSchemaSql(projectDir);
  if (!schemaFile) {
    return {
      ...privateDatabase,
      schema: {
        ...(privateDatabase.schema || {}),
        status: "skipped",
        statusLabel: "未检测到初始化脚本",
        source: "",
        error: "",
        executedAt: null
      }
    };
  }
  const executedAt = new Date().toISOString();
  if (createDemoDatabaseConfig(config).mock) {
    const mockError = await detectMockSchemaError(schemaFile.relativePath, projectDir);
    if (mockError) {
      return {
        ...privateDatabase,
        status: "failed",
        statusLabel: "初始化失败",
        schema: {
          status: "failed",
          statusLabel: "初始化失败",
          source: schemaFile.relativePath,
          error: mockError,
          executedAt
        }
      };
    }
    return {
      ...privateDatabase,
      initializedAt: executedAt,
      schema: {
        status: "ready",
        statusLabel: "初始化完成",
        source: schemaFile.relativePath,
        error: "",
        executedAt
      }
    };
  }
  try {
    const sql = await fsReadFile(schemaFile.fullPath);
    await executeSchemaSql(privateDatabase, sql, config);
    return {
      ...privateDatabase,
      initializedAt: executedAt,
      schema: {
        status: "ready",
        statusLabel: "初始化完成",
        source: schemaFile.relativePath,
        error: "",
        executedAt
      }
    };
  } catch (error) {
    return {
      ...privateDatabase,
      status: "failed",
      statusLabel: "初始化失败",
      schema: {
        status: "failed",
        statusLabel: "初始化失败",
        source: schemaFile.relativePath,
        error: error instanceof Error ? error.message : "数据库初始化失败",
        executedAt
      }
    };
  }
}

export async function resetDemoDatabase(database, { projectDir = "", config = {} } = {}) {
  const privateDatabase = getPrivateDatabase(database);
  if (!privateDatabase?.enabled || privateDatabase.engine !== "mysql" || privateDatabase.status === "deleted") {
    throw createDatabaseError("这个项目没有可重置的 MySQL 试用数据库。");
  }
  const dbConfig = createDemoDatabaseConfig(config);
  const resetAt = new Date().toISOString();
  if (dbConfig.mock) {
    return initializeDemoDatabase({
      ...privateDatabase,
      status: "ready",
      statusLabel: "已启用",
      resetAt
    }, { projectDir, config });
  }
  if (!isDemoDatabaseReady(config)) {
    throw createDatabaseError("平台试用数据库尚未配置完成，无法重置。");
  }
  if (!isSafeMysqlIdentifier(privateDatabase.databaseName)) {
    throw createDatabaseError("试用数据库标识异常，已停止重置。");
  }
  const connection = await mysql.createConnection({
    host: dbConfig.adminHost,
    port: dbConfig.adminPort,
    user: dbConfig.adminUser,
    password: dbConfig.adminPassword,
    multipleStatements: true
  });
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${privateDatabase.databaseName}\``);
    await connection.query(`CREATE DATABASE \`${privateDatabase.databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`GRANT ${DEMO_DATABASE_PRIVILEGES} ON \`${privateDatabase.databaseName}\`.* TO ?@'%'`, [privateDatabase.userName]);
  } finally {
    await connection.end();
  }
  return initializeDemoDatabase({
    ...privateDatabase,
    status: "ready",
    statusLabel: "已启用",
    resetAt
  }, { projectDir, config });
}

export async function deleteDemoDatabase(database, config = {}) {
  const privateDatabase = getPrivateDatabase(database);
  if (!privateDatabase?.enabled || privateDatabase.engine !== "mysql") return null;

  const dbConfig = createDemoDatabaseConfig(config);
  const next = {
    ...privateDatabase,
    status: "deleted",
    statusLabel: "已清理",
    deletedAt: new Date().toISOString()
  };

  if (!isDemoDatabaseReady(config) || dbConfig.mock) return next;

  const databaseName = privateDatabase.databaseName;
  const userName = privateDatabase.userName;
  if (!isSafeMysqlIdentifier(databaseName) || !isSafeMysqlIdentifier(userName)) {
    throw createDatabaseError("试用数据库标识异常，已停止自动清理。");
  }

  const connection = await mysql.createConnection({
    host: dbConfig.adminHost,
    port: dbConfig.adminPort,
    user: dbConfig.adminUser,
    password: dbConfig.adminPassword,
    multipleStatements: false
  });
  try {
    await cleanupMysqlDatabase(connection, databaseName, userName);
    return next;
  } finally {
    await connection.end();
  }
}

export function getPrivateDatabase(database) {
  if (!database || typeof database !== "object") return null;
  return database;
}

export function publicDemoDatabase(database) {
  const privateDatabase = getPrivateDatabase(database);
  if (!privateDatabase?.enabled) return null;
  return {
    enabled: true,
    engine: privateDatabase.engine || "mysql",
    databaseName: privateDatabase.databaseName || "",
    userName: privateDatabase.userName || "",
    status: privateDatabase.status || "ready",
    statusLabel: privateDatabase.statusLabel || databaseStatusLabel(privateDatabase.status),
    host: privateDatabase.host || "",
    port: privateDatabase.port || null,
    initializedAt: privateDatabase.initializedAt || null,
    resetAt: privateDatabase.resetAt || null,
    schema: publicSchemaStatus(privateDatabase.schema),
    createdAt: privateDatabase.createdAt || null,
    deletedAt: privateDatabase.deletedAt || null
  };
}

export function demoDatabaseEnv(database) {
  const privateDatabase = getPrivateDatabase(database);
  if (!privateDatabase?.enabled || privateDatabase.status === "deleted") return {};
  return sanitizeEnv(privateDatabase.env || {});
}

function createDatabaseEnv({ databaseName, userName, password, dbConfig }) {
  const host = dbConfig.host;
  const port = String(dbConfig.port || 3306);
  const encodedPassword = encodeURIComponent(password);
  return {
    MYSQL_HOST: host,
    MYSQL_PORT: port,
    MYSQL_DATABASE: databaseName,
    MYSQL_USER: userName,
    MYSQL_PASSWORD: password,
    DATABASE_URL: `mysql://${userName}:${encodedPassword}@${host}:${port}/${databaseName}`
  };
}

function sanitizeEnv(env = {}) {
  const result = {};
  for (const [key, value] of Object.entries(env)) {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) continue;
    result[key] = String(value ?? "");
  }
  return result;
}

async function findSchemaSql(projectDir) {
  if (!projectDir) return null;
  const candidates = [
    "schema.sql",
    "db/schema.sql",
    "database/schema.sql",
    "sql/schema.sql"
  ];
  for (const relativePath of candidates) {
    const fullPath = `${projectDir}/${relativePath}`.replace(/\\/g, "/");
    try {
      const stat = await import("node:fs/promises").then((module) => module.stat(fullPath));
      if (stat.isFile() && stat.size <= 1024 * 1024) return { relativePath, fullPath };
    } catch {
      // Try the next conventional schema path.
    }
  }
  return null;
}

async function detectMockSchemaError(relativePath, projectDir) {
  if (!process.env.DEMOGO_DEMO_DB_MOCK_VALIDATE_SCHEMA) return "";
  try {
    const fullPath = `${projectDir}/${relativePath}`.replace(/\\/g, "/");
    const sql = await fsReadFile(fullPath);
    if (/DEMOGO_SCHEMA_ERROR|INVALID_SQL|BROKEN_SCHEMA/i.test(sql)) {
      return "schema.sql 包含无效 SQL 标记，mock MySQL 验证已拒绝执行。";
    }
  } catch (error) {
    return error instanceof Error ? error.message : "schema.sql 读取失败";
  }
  return "";
}

async function fsReadFile(filePath) {
  const fs = await import("node:fs/promises");
  return fs.readFile(filePath, "utf8");
}

async function executeSchemaSql(database, sql, config = {}) {
  const dbConfig = createDemoDatabaseConfig(config);
  const connection = await mysql.createConnection({
    host: dbConfig.adminHost,
    port: dbConfig.adminPort,
    user: dbConfig.adminUser,
    password: dbConfig.adminPassword,
    database: database.databaseName,
    multipleStatements: true
  });
  try {
    await connection.query(sql);
  } finally {
    await connection.end();
  }
}

function publicSchemaStatus(schema = {}) {
  if (!schema || typeof schema !== "object") {
    return {
      status: "skipped",
      statusLabel: "未检测到初始化脚本",
      source: "",
      error: "",
      executedAt: null
    };
  }
  return {
    status: schema.status || "skipped",
    statusLabel: schema.statusLabel || schemaStatusLabel(schema.status),
    source: schema.source || "",
    error: schema.error || "",
    executedAt: schema.executedAt || null
  };
}

function schemaStatusLabel(status) {
  if (status === "ready") return "初始化完成";
  if (status === "failed") return "初始化失败";
  return "未检测到初始化脚本";
}

async function cleanupMysqlDatabase(connection, databaseName, userName) {
  if (!isSafeMysqlIdentifier(databaseName) || !isSafeMysqlIdentifier(userName)) return;
  await connection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
  await connection.query(`DROP USER IF EXISTS ?@'%'`, [userName]);
}

function createDatabaseName(slug) {
  const normalized = normalizeIdentifierPart(slug).slice(0, 36);
  return `demogo_demo_${normalized}_${crypto.randomBytes(3).toString("hex")}`.slice(0, 64);
}

function createUserName(slug) {
  const normalized = normalizeIdentifierPart(slug).slice(0, 20);
  return `demogo_u_${normalized}_${crypto.randomBytes(2).toString("hex")}`.slice(0, 32);
}

function normalizeIdentifierPart(value) {
  return String(value || "demo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "demo";
}

function isSafeMysqlIdentifier(value) {
  return /^demogo_(demo|u)_[a-z0-9_]+$/.test(String(value || ""));
}

function databaseStatusLabel(status) {
  if (status === "deleted") return "已清理";
  if (status === "failed") return "创建失败";
  return "已启用";
}

function createDatabaseError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}


/**
 * 查询试用数据库中的所有表及其结构
 */
export async function queryDemoDatabaseTables(database, config = {}) {
  if (!database?.databaseName || !config.demoDbAdminHost) {
    return [];
  }
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.demoDbAdminHost,
      port: Number(config.demoDbAdminPort || 3306),
      user: config.demoDbAdminUser || 'root',
      password: config.demoDbAdminPassword || '',
      database: database.databaseName
    });

    const [columns] = await connection.query(
      'SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
      [database.databaseName]
    );

    const tables = [];
    for (const col of columns) {
      const [fields] = await connection.query(
        'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
        [database.databaseName, col.TABLE_NAME]
      );
      tables.push({
        name: col.TABLE_NAME,
        rowCount: Number(col.TABLE_ROWS || 0),
        createdAt: col.CREATE_TIME,
        comment: col.TABLE_COMMENT || '',
        columns: fields.map((f) => ({
          name: f.COLUMN_NAME,
          type: f.DATA_TYPE,
          nullable: f.IS_NULLABLE === 'YES',
          isPrimaryKey: f.COLUMN_KEY === 'PRI',
          comment: f.COLUMN_COMMENT || ''
        }))
      });
    }

    return tables;
  } catch (error) {
    return [];
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}

/**
 * 查询试用数据库中某个表的数据
 */
export async function queryDemoDatabaseRows(database, tableName, config = {}) {
  if (!database?.databaseName || !config.demoDbAdminHost) {
    return [];
  }
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.demoDbAdminHost,
      port: Number(config.demoDbAdminPort || 3306),
      user: config.demoDbAdminUser || 'root',
      password: config.demoDbAdminPassword || '',
      database: database.databaseName
    });

    const sql = 'SELECT * FROM ' + connection.escapeId(tableName) + ' ORDER BY 1 DESC';
    const [rows] = await connection.query(sql);

    return rows;
  } catch (error) {
    return [];
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}


/**
 * 导出试用数据库中某个表的全部数据为 CSV
 */
export async function exportDemoDatabaseCsv(database, tableName, config = {}) {
  if (!database?.databaseName || !config.demoDbAdminHost) {
    return '';
  }
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.demoDbAdminHost,
      port: Number(config.demoDbAdminPort || 3306),
      user: config.demoDbAdminUser || 'root',
      password: config.demoDbAdminPassword || '',
      database: database.databaseName
    });

    const sql = 'SELECT * FROM ' + connection.escapeId(tableName);
    const [rows] = await connection.query(sql);

    if (!rows.length) return '';

    const headers = Object.keys(rows[0]);
    const csvLines = [headers.join(',')];
    for (const row of rows) {
      const values = headers.map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      });
      csvLines.push(values.join(','));
    }
    return csvLines.join('\n');
  } catch (error) {
    return '';
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}
