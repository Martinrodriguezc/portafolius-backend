import winston from 'winston';
import { config } from './index';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level.toUpperCase()}] ${message} ${metaString}`;
  })
);

const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  transports: [
    // Loguea en consola
    new winston.transports.Console(),
    // Opcional: Loguea errores en un archivo
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Opcional: Logs combinados en archivo
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export default logger;
