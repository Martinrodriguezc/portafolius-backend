import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error(
    'La variable de entorno JWT_SECRET no está definida. Por favor, configúrala para continuar.'
  );
}

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) //REVISAR
    : [],
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  S3_BUCKET: process.env.S3_BUCKET,
};
