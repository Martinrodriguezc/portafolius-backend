import { Pool } from "pg";
import { config } from './index';

const isProduction = config.NODE_ENV === "production";

if (!config.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada');
}

const DbConfig = {
  connectionString: config.DATABASE_URL,
  ...(isProduction && {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: { rejectUnauthorized: false }
  })
};

export const pool = new Pool(DbConfig);

// Agregar listener para errores de conexión
pool.on('error', (err) => {
  console.error('Error inesperado del pool de PostgreSQL', err);
});

// Eliminaremos la configuración de MongoDB ya que usaremos PostgreSQL


