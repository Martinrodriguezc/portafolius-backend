import { Pool } from "pg";
import { config } from './index';

const isProduction = config.NODE_ENV === "production";

if (!config.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada');
}

// Configuración básica para desarrollo, extendida para producción
const DbConfig = isProduction 
  ? {
      connectionString: config.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: { rejectUnauthorized: false }
    }
  : {
      connectionString: config.DATABASE_URL
    };

export const pool = new Pool(DbConfig);

// Agregar listener para errores de conexión
pool.on('error', (err) => {
  console.error('Error inesperado del pool de PostgreSQL', err);
});

// Eliminaremos la configuración de MongoDB ya que usaremos PostgreSQL


