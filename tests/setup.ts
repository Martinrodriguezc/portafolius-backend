// Configuración global para todos los tests
import { pool } from '../src/config/db';

// Configuración de ambiente
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_portafolius';

// Configurar timeout por defecto para tests de integración
jest.setTimeout(30000);

// Variables globales para cleanup
let testUsersToCleanup: number[] = [];
let testStudiesToCleanup: number[] = [];

// Función global para limpiar datos de test
export const addTestUserForCleanup = (userId: number) => {
  testUsersToCleanup.push(userId);
};

export const addTestStudyForCleanup = (studyId: number) => {
  testStudiesToCleanup.push(studyId);
};

// Mock de módulos EXTERNOS que no queremos ejecutar realmente
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

// Mock de AWS S3 para no hacer llamadas reales
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetObjectCommand: jest.fn(),
  PutObjectCommand: jest.fn(),
}));

// Mock de bcrypt - permitir que funcione pero con datos controlados
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation((password: string, rounds: number) => 
    Promise.resolve(`hashed_${password}_${rounds}`)
  ),
  compare: jest.fn().mockImplementation((password: string, hash: string) => {
    // Si el hash contiene la password, es válida
    return Promise.resolve(hash.includes(password));
  }),
}));

// Mock de JWT solo para tests unitarios (archivos .unit.test.ts)
// Los tests de integración (archivos .test.ts) usarán JWT real
const isUnitTest = process.argv.some(arg => arg.includes('.unit.test.ts'));

if (isUnitTest) {
  jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockImplementation((payload: any, secret: string, options: any) => {
      return `jwt_token_${payload.id}_${payload.email}`;
    }),
    verify: jest.fn().mockImplementation((token: string, secret: string, callback: Function) => {
      // Simular token válido si tiene el formato esperado
      if (token.startsWith('jwt_token_')) {
        const parts = token.split('_');
        const payload = {
          id: parseInt(parts[2]),
          email: parts[3],
          role: 'estudiante'
        };
        callback(null, payload);
      } else {
        callback(new Error('Invalid token'), null);
      }
    }),
  }));
}

// Función de limpieza después de cada suite de tests
afterAll(async () => {
  // Limpiar usuarios de test
  if (testUsersToCleanup.length > 0) {
    try {
      await pool.query(
        `DELETE FROM users WHERE id = ANY($1)`,
        [testUsersToCleanup]
      );
    } catch (error) {
      console.warn('Error cleaning up test users:', error);
    }
  }

  // Limpiar estudios de test
  if (testStudiesToCleanup.length > 0) {
    try {
      await pool.query(
        `DELETE FROM study WHERE id = ANY($1)`,
        [testStudiesToCleanup]
      );
    } catch (error) {
      console.warn('Error cleaning up test studies:', error);
    }
  }

  // Cerrar pool de conexiones
  if (pool && pool.end) {
    await pool.end();
  }
});

// Función para crear datos de test únicos
export const createUniqueTestData = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  
  return {
    email: `test_${timestamp}_${random}@example.com`,
    firstName: `TestUser_${timestamp}`,
    lastName: `TestLastName_${random}`,
    title: `Test Study ${timestamp}`,
    timestamp,
    random
  };
};

// Helper para esperar un tiempo específico
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

console.log('🧪 Test setup consolidado cargado - Modo:', process.env.NODE_ENV); 