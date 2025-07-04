import { Request, Response } from 'express';

// Mock de módulos ANTES de importar
jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

import { getUsers } from '../../../src/controllers/userController/getUsers';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';

// Referencias a los mocks
const mockPool = pool as jest.Mocked<typeof pool>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('GetUsers Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Reset de todos los mocks
    jest.clearAllMocks();

    // Setup del request
    mockReq = {};

    // Setup del response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('Casos exitosos', () => {
    test('1. Debe obtener lista de usuarios exitosamente', async () => {
      const mockUsers = [
        {
          id: 1,
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan@example.com',
          role: 'estudiante'
        },
        {
          id: 2,
          first_name: 'María',
          last_name: 'García',
          email: 'maria@example.com',
          role: 'profesor'
        }
      ];

      const mockQueryResult = {
        rows: mockUsers,
        rowCount: 2,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id, first_name, last_name, email, role FROM Users'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUsers);
      expect(mockLogger.info).toHaveBeenCalledWith('Lista de usuarios recuperada exitosamente');
    });

    test('2. Debe manejar lista vacía de usuarios', async () => {
      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockEmptyResult);

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id, first_name, last_name, email, role FROM Users'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
      expect(mockLogger.info).toHaveBeenCalledWith('Lista de usuarios recuperada exitosamente');
    });

    test('3. Debe verificar la query SQL correcta', async () => {
      const mockUsers = [
        {
          id: 3,
          first_name: 'Carlos',
          last_name: 'López',
          email: 'carlos@example.com',
          role: 'administrador'
        }
      ];

      const mockQueryResult = {
        rows: mockUsers,
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getUsers(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      
      expect(actualQuery).toContain('SELECT');
      expect(actualQuery).toContain('id, first_name, last_name, email, role');
      expect(actualQuery).toContain('FROM Users');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    test('4. Debe retornar múltiples usuarios con estructura correcta', async () => {
      const mockUsers = [
        {
          id: 1,
          first_name: 'Ana',
          last_name: 'Martínez',
          email: 'ana@example.com',
          role: 'estudiante'
        },
        {
          id: 2,
          first_name: 'Pedro',
          last_name: 'Sánchez',
          email: 'pedro@example.com',
          role: 'profesor'
        },
        {
          id: 3,
          first_name: 'Laura',
          last_name: 'Rodríguez',
          email: 'laura@example.com',
          role: 'administrador'
        }
      ];

      const mockQueryResult = {
        rows: mockUsers,
        rowCount: 3,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockUsers);
      expect(Array.isArray(mockUsers)).toBe(true);
      expect(mockUsers.length).toBe(3);
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('5. Debe manejar errores de conexión de base de datos', async () => {
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(dbError);

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener usuarios'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener usuarios',
        { error: dbError }
      );
    });

    test('6. Debe manejar diferentes tipos de errores de DB', async () => {
      const timeoutError = new Error('Query timeout');
      mockPool.query.mockRejectedValue(timeoutError);

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener usuarios'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener usuarios',
        { error: timeoutError }
      );
    });

    test('7. Debe manejar errores de sintaxis SQL', async () => {
      const sqlError = new Error('Syntax error in SQL query');
      mockPool.query.mockRejectedValue(sqlError);

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener usuarios'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener usuarios',
        { error: sqlError }
      );
    });
  });

  describe('Estructura de respuesta', () => {
    test('8. Debe retornar array de usuarios con campos correctos', async () => {
      const mockUsers = [
        {
          id: 1,
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          role: 'estudiante'
        }
      ];

      const mockQueryResult = {
        rows: mockUsers,
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            first_name: expect.any(String),
            last_name: expect.any(String),
            email: expect.any(String),
            role: expect.any(String),
          })
        ])
      );
    });

    test('9. Debe retornar status 200 para respuesta exitosa', async () => {
      const mockUsers = [
        {
          id: 2,
          first_name: 'Another',
          last_name: 'User',
          email: 'another@example.com',
          role: 'profesor'
        }
      ];

      const mockQueryResult = {
        rows: mockUsers,
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.status).toHaveBeenCalledTimes(1);
    });

    test('10. Debe retornar estructura correcta para error 500', async () => {
      const dbError = new Error('Database error');
      mockPool.query.mockRejectedValue(dbError);

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.any(String),
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener usuarios'
      });
    });
  });

  describe('Logging y auditoría', () => {
    test('11. Debe registrar log de éxito correctamente', async () => {
      const mockUsers = [
        {
          id: 1,
          first_name: 'Success',
          last_name: 'Test',
          email: 'success@example.com',
          role: 'estudiante'
        }
      ];

      const mockQueryResult = {
        rows: mockUsers,
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith('Lista de usuarios recuperada exitosamente');
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('12. Debe registrar log de éxito incluso con lista vacía', async () => {
      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockEmptyResult);

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith('Lista de usuarios recuperada exitosamente');
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('13. Debe registrar log de error con detalles', async () => {
      const specificError = new Error('Connection pool exhausted');
      mockPool.query.mockRejectedValue(specificError);

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener usuarios',
        { error: specificError }
      );
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Flujo de ejecución', () => {
    test('14. Debe ejecutar query antes de retornar respuesta', async () => {
      const mockUsers = [
        {
          id: 1,
          first_name: 'Flow',
          last_name: 'Test',
          email: 'flow@example.com',
          role: 'estudiante'
        }
      ];

      const mockQueryResult = {
        rows: mockUsers,
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getUsers(mockReq as Request, mockRes as Response);

      // Verificar que todas las funciones fueron llamadas
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
    });
  });
}); 