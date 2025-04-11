import { Pool } from "pg";
import { config } from './index';

const isProduction = config.NODE_ENV === "production";

const DbConfig = {
  connectionString: config.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/tudb',
  ...(isProduction && {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: { rejectUnauthorized: false }
  })
};

export const pool = new Pool(DbConfig);

// Eliminaremos la configuración de MongoDB ya que usaremos PostgreSQL


