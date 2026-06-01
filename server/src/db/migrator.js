// DemoGo v0.9.6 ? Database migration runner (Umzug)
// Usage: node src/db/migrator.js [up|down|pending]

import { Umzug, JSONStorage } from "umzug";
import { getPool, isMysqlConfigured } from "./mysql.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createMigrator() {
  if (!isMysqlConfigured()) {
    throw new Error("MySQL is not configured. Set DEMOGO_DB_* environment variables.");
  }

  const pool = getPool();

  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, "migrations", "*.mjs"),
      resolve: ({ name, path: migrationPath }) => {
        return import(migrationPath).then((m) => ({
          name,
          up: async () => m.up({ query: (sql) => pool.execute(sql) }),
          down: async () => m.down({ query: (sql) => pool.execute(sql) }),
        }));
      },
    },
    context: { pool },
    storage: new JSONStorage({
      path: path.join(__dirname, "..", "..", "data", "migrations.json"),
    }),
    logger: console,
  });

  return umzug;
}

// CLI entry point
async function main() {
  const command = process.argv[2] || "up";

  try {
    const migrator = await createMigrator();

    if (command === "up") {
      const migrations = await migrator.up();
      if (migrations.length === 0) {
        console.log("No pending migrations.");
      } else {
        console.log(`Applied ${migrations.length} migration(s):`);
        migrations.forEach((m) => console.log(`  - ${m.name}`));
      }
    } else if (command === "down") {
      const migrations = await migrator.down();
      if (migrations.length === 0) {
        console.log("No migrations to revert.");
      } else {
        console.log(`Reverted ${migrations.length} migration(s):`);
        migrations.forEach((m) => console.log(`  - ${m.name}`));
      }
    } else if (command === "pending") {
      const pending = await migrator.pending();
      if (pending.length === 0) {
        console.log("All migrations are applied.");
      } else {
        console.log(`Pending migrations (${pending.length}):`);
        pending.forEach((m) => console.log(`  - ${m.name}`));
      }
    } else {
      console.error(`Unknown command: ${command}`);
      console.error("Usage: node src/db/migrator.js [up|down|pending]");
      process.exit(1);
    }

    // Close pool
    const pool = getPool();
    await pool.end();
  } catch (error) {
    console.error("Migration error:", error.message);
    process.exit(1);
  }
}

// Only run CLI when executed directly
const isMain = process.argv[1] && (
  process.argv[1].includes("migrator.js") ||
  process.argv[1].endsWith("migrator")
);

if (isMain) {
  main();
}
