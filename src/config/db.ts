import { Pool } from "pg";
import { config } from './index';

const isProduction = config.NODE_ENV === "production";

const DbConfig: any = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

if (isProduction) {
  DbConfig.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(DbConfig);


