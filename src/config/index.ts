import dotenv from 'dotenv';

dotenv.config();

// Solo validamos en desarrollo
if (process.env.NODE_ENV !== 'production' && !process.env.JWT_SECRET) {
    throw new Error('La variable de entorno JWT_SECRET no está definida. Por favor, configúrala para continuar.');
}

export const config = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/tudb',
  JWT_SECRET: process.env.JWT_SECRET || 'secret_for_development',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
