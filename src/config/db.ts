import { Pool } from "pg";
import { config } from "./index";

if (!config.DATABASE_URL) {
  throw new Error("DATABASE_URL no está configurada");
}

const isProduction = config.NODE_ENV === "production";
const useSsl      = isProduction && process.env.DB_SSL !== "false";

const DbConfig = {
  connectionString: config.DATABASE_URL,
  ...(useSsl
    ? { ssl: { rejectUnauthorized: false } }
    : { ssl: false }),
};


export const pool = new Pool(DbConfig);

pool.on("error", (err) => {
  console.error("Error inesperado del pool de PostgreSQL", err);
});
