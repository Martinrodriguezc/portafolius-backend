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

import { deleteUser } from '../../../src/controllers/userController/deleteUserById';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';

// Referencias a los mocks
const mockPool = pool as jest.Mocked<typeof pool>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('DeleteUserById Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Reset de todos los mocks
    jest.clearAllMocks();

    // Setup del request
    mockReq = {
      params: {},
    };

    // Setup del response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('Casos exitosos', () => {
    test('1. Debe eliminar usuario exitosamente', async () => {
      const userId = '123';
      mockReq.params = { id: userId };

      // Mock de respuesta exitosa de DB
      const mockDeleteResult = {
        rows: [{ id: 123 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDeleteResult);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM Users WHERE id = $1 RETURNING id',
        [userId]
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Usuario eliminado correctamente'
      });
      expect(mockLogger.info).toHaveBeenCalledWith(`Usuario eliminado exitosamente: ${userId}`);
    });

    test('2. Debe manejar IDs numéricos correctamente', async () => {
      const userId = '456';
      mockReq.params = { id: userId };

      const mockDeleteResult = {
        rows: [{ id: 456 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDeleteResult);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM Users WHERE id = $1 RETURNING id',
        [userId]
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockLogger.info).toHaveBeenCalledWith(`Usuario eliminado exitosamente: ${userId}`);
    });

    test('3. Debe verificar la query SQL correcta', async () => {
      const userId = '789';
      mockReq.params = { id: userId };

      const mockDeleteResult = {
        rows: [{ id: 789 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDeleteResult);

      await deleteUser(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      const actualParams = mockPool.query.mock.calls[0][1] as string[];

      expect(actualQuery).toContain('DELETE FROM Users');
      expect(actualQuery).toContain('WHERE id = $1');
      expect(actualQuery).toContain('RETURNING id');
      expect(actualParams).toEqual([userId]);
    });
  });

  describe('Casos de error - Usuario no encontrado', () => {
    test('4. Debe retornar 404 cuando el usuario no existe', async () => {
      const userId = '999';
      mockReq.params = { id: userId };

      // Mock de respuesta vacía de DB
      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockEmptyResult);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Usuario no encontrado'
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(`Usuario no encontrado para eliminar, ID: ${userId}`);
    });

    test('5. Debe manejar correctamente array vacío de resultados', async () => {
      const userId = '888';
      mockReq.params = { id: userId };

      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockEmptyResult);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM Users WHERE id = $1 RETURNING id',
        [userId]
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockLogger.warn).toHaveBeenCalledWith(`Usuario no encontrado para eliminar, ID: ${userId}`);
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('6. Debe manejar errores de base de datos', async () => {
      const userId = '111';
      mockReq.params = { id: userId };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(dbError);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al eliminar usuario'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error al eliminar usuario con ID: ${userId}`,
        { error: dbError }
      );
    });

    test('7. Debe manejar diferentes tipos de errores de DB', async () => {
      const userId = '222';
      mockReq.params = { id: userId };

      const constraintError = new Error('Foreign key constraint violation');
      mockPool.query.mockRejectedValue(constraintError);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al eliminar usuario'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error al eliminar usuario con ID: ${userId}`,
        { error: constraintError }
      );
    });
  });

  describe('Validación de parámetros', () => {
    test('8. Debe procesar IDs string correctamente', async () => {
      const userId = 'abc123';
      mockReq.params = { id: userId };

      const mockDeleteResult = {
        rows: [{ id: 'abc123' }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDeleteResult);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM Users WHERE id = $1 RETURNING id',
        [userId]
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('9. Debe manejar IDs vacíos', async () => {
      const userId = '';
      mockReq.params = { id: userId };

      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockEmptyResult);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM Users WHERE id = $1 RETURNING id',
        [userId]
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Estructura de respuesta', () => {
    test('10. Debe retornar estructura correcta en éxito', async () => {
      const userId = '555';
      mockReq.params = { id: userId };

      const mockDeleteResult = {
        rows: [{ id: 555 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDeleteResult);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.any(String),
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Usuario eliminado correctamente'
      });
    });

    test('11. Debe retornar estructura correcta en error 404', async () => {
      const userId = '666';
      mockReq.params = { id: userId };

      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockEmptyResult);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.any(String),
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Usuario no encontrado'
      });
    });
  });

  describe('Logging y auditoría', () => {
    test('12. Debe registrar log de éxito correctamente', async () => {
      const userId = '777';
      mockReq.params = { id: userId };

      const mockDeleteResult = {
        rows: [{ id: 777 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDeleteResult);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(`Usuario eliminado exitosamente: ${userId}`);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('13. Debe registrar log de advertencia para usuario no encontrado', async () => {
      const userId = '888';
      mockReq.params = { id: userId };

      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockEmptyResult);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(`Usuario no encontrado para eliminar, ID: ${userId}`);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('14. Debe registrar log de error con detalles', async () => {
      const userId = '999';
      mockReq.params = { id: userId };

      const specificError = new Error('Connection timeout');
      mockPool.query.mockRejectedValue(specificError);

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error al eliminar usuario con ID: ${userId}`,
        { error: specificError }
      );
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
}); 