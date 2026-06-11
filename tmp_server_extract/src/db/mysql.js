import mysql from "mysql2/promise";

const dbConfig = {
  host: process.env.DEMOGO_DB_HOST || "",
  port: Number(process.env.DEMOGO_DB_PORT || 3306),
  database: process.env.DEMOGO_DB_NAME || "",
  user: process.env.DEMOGO_DB_USER || "",
  password: process.env.DEMOGO_DB_PASSWORD || ""
};

let pool;

export function isMysqlConfigured() {
  return Boolean(dbConfig.host && dbConfig.database && dbConfig.user && dbConfig.password);
}

export function getPool() {
  if (!isMysqlConfigured()) {
    throw new Error("MySQL is not configured. Please set DEMOGO_DB_* environment variables.");
  }

  if (!pool) {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: Number(process.env.DEMOGO_DB_POOL_LIMIT || 10),
      queueLimit: 0,
      charset: "utf8mb4"
    });
  }

  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

export async function transaction(callback) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
