import { Pool } from "pg";
import { config } from "./index";

const isProduction = config.NODE_ENV === "production";

if (!config.DATABASE_URL) {
  throw new Error("DATABASE_URL no está configurada");
}

const DbConfig = isProduction
  ? {
      connectionString: config.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: { rejectUnauthorized: false },
    }
  : {
      connectionString: config.DATABASE_URL,
    };

export const pool = new Pool(DbConfig);

pool.on("error", (err) => {
  console.error("Error inesperado del pool de PostgreSQL", err);
});
