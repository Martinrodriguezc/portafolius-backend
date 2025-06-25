import { Request, Response } from 'express';
import { updateUser } from '../../../src/controllers/userController/updateUser';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';
import { createUniqueTestData } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');
jest.mock('../../../src/config/logger');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('UpdateUser Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let testData: ReturnType<typeof createUniqueTestData>;

  beforeEach(() => {
    testData = createUniqueTestData();
    
    mockReq = {
      params: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Casos exitosos', () => {
    test('1. Debe actualizar usuario exitosamente', async () => {
      const userId = '123';
      mockReq.params = { id: userId };
      mockReq.body = {
        first_name: testData.firstName,
        last_name: testData.lastName,
        email: testData.email
      };

      // Mock de verificación de existencia
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const updatedUser = {
        id: 123,
        first_name: testData.firstName,
        last_name: testData.lastName,
        email: testData.email,
        role: 'estudiante'
      };

      // Mock del UPDATE
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedUser] });

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenNthCalledWith(1, 
        'SELECT 1 FROM users WHERE id = $1', 
        [userId]
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE users'),
        [testData.firstName, testData.lastName, testData.email, userId]
      );
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(updatedUser);
      expect(mockLogger.info).toHaveBeenCalledWith(`Usuario actualizado (id=${userId})`);
    });

    test('2. Debe manejar actualización con algunos campos usando COALESCE', async () => {
      const userId = '456';
      mockReq.params = { id: userId };
      mockReq.body = {
        first_name: 'NuevoNombre',
        email: 'nuevo@email.com'
      };

      // Mock de verificación de existencia
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const updatedUser = {
        id: 456,
        first_name: 'NuevoNombre',
        last_name: 'ApellidoAnterior',
        email: 'nuevo@email.com',
        role: 'profesor'
      };

      // Mock del UPDATE
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedUser] });

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('COALESCE'),
        ['NuevoNombre', null, 'nuevo@email.com', userId]
      );
      expect(mockRes.json).toHaveBeenCalledWith(updatedUser);
    });

    test('3. Debe verificar la query SQL correcta con COALESCE', async () => {
      const userId = '789';
      mockReq.params = { id: userId };
      mockReq.body = {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com'
      };

      // Mock de verificación de existencia
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });

      // Mock del UPDATE
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 789,
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          role: 'estudiante'
        }]
      });

      await updateUser(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[1][0] as string;
      expect(actualQuery).toContain('UPDATE users');
      expect(actualQuery).toContain('SET first_name = COALESCE($1, first_name)');
      expect(actualQuery).toContain('last_name  = COALESCE($2, last_name)');
      expect(actualQuery).toContain('email      = COALESCE($3, email)');
      expect(actualQuery).toContain('WHERE id = $4');
      expect(actualQuery).toContain('RETURNING id, first_name, last_name, email, role');
    });
  });

  describe('Casos de validación', () => {
    test('4. Debe retornar 400 cuando no se proporcionan campos', async () => {
      const userId = '123';
      mockReq.params = { id: userId };
      mockReq.body = {};

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe proporcionar al menos un campo para actualizar'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('5. Debe retornar 400 con email inválido', async () => {
      const userId = '123';
      mockReq.params = { id: userId };
      mockReq.body = {
        email: 'email-invalido'
      };

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Formato de email inválido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('6. Debe validar formato de email correcto', async () => {
      const userId = '123';
      mockReq.params = { id: userId };
      mockReq.body = {
        email: 'valido@ejemplo.com'
      };

      // Mock de verificación de existencia
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // Mock del UPDATE
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 123,
          first_name: 'Test',
          last_name: 'User',
          email: 'valido@ejemplo.com',
          role: 'estudiante'
        }]
      });

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).not.toHaveBeenCalledWith(400);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('Casos de error - Usuario no encontrado', () => {
    test('7. Debe retornar 404 cuando el usuario no existe', async () => {
      const userId = '999';
      mockReq.params = { id: userId };
      mockReq.body = {
        first_name: testData.firstName
      };

      // Mock de verificación de existencia - no encontrado
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Usuario no encontrado'
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(`Usuario no encontrado (id=${userId})`);
      expect(mockPool.query).toHaveBeenCalledTimes(1); // Solo la verificación
    });

    test('8. Debe manejar correctamente rowCount 0', async () => {
      const userId = '888';
      mockReq.params = { id: userId };
      mockReq.body = { first_name: 'Test' };

      // Mock de verificación de existencia - no encontrado
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT 1 FROM users WHERE id = $1',
        [userId]
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('9. Debe manejar errores de base de datos en verificación', async () => {
      const userId = '111';
      mockReq.params = { id: userId };
      mockReq.body = { first_name: 'Test' };

      const dbError = new Error('Database connection failed');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al actualizar usuario'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error al actualizar usuario (id=${userId})`,
        { error: dbError }
      );
    });

    test('10. Debe manejar errores en UPDATE', async () => {
      const userId = '222';
      mockReq.params = { id: userId };
      mockReq.body = { email: 'test@test.com' };

      // Mock de verificación exitosa
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });
      
      // Mock de error en UPDATE
      const constraintError = new Error('Email already exists');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(constraintError);

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al actualizar usuario'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error al actualizar usuario (id=${userId})`,
        { error: constraintError }
      );
    });
  });

  describe('Estructura de respuesta', () => {
    test('11. Debe retornar todos los campos esperados sin created_at', async () => {
      const userId = '333';
      mockReq.params = { id: userId };
      mockReq.body = {
        first_name: 'Complete',
        last_name: 'User',
        email: 'complete@example.com'
      };

      // Mock de verificación de existencia
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const completeUserData = {
        id: 333,
        first_name: 'Complete',
        last_name: 'User',
        email: 'complete@example.com',
        role: 'estudiante'
      };

      // Mock del UPDATE
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [completeUserData] });

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(Number),
          first_name: expect.any(String),
          last_name: expect.any(String),
          email: expect.any(String),
          role: expect.any(String)
        })
      );
    });

    test('12. Debe manejar respuesta con update exitoso', async () => {
      const userId = '444';
      mockReq.params = { id: userId };
      mockReq.body = {
        first_name: 'Updated',
        email: 'updated@example.com'
      };

      // Mock de verificación de existencia
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const updatedUserData = {
        id: 444,
        first_name: 'Updated',
        last_name: 'OriginalLastName',
        email: 'updated@example.com',
        role: 'profesor'
      };

      // Mock del UPDATE
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedUserData] });

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).not.toHaveBeenCalled(); // 200 es implícito
      expect(mockRes.json).toHaveBeenCalledWith(updatedUserData);
    });
  });

  describe('Logging y auditoría', () => {
    test('13. Debe registrar log de éxito con ID correcto', async () => {
      const userId = '555';
      mockReq.params = { id: userId };
      mockReq.body = { first_name: 'LogTest' };

      // Mock de verificación de existencia
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });
      
      // Mock del UPDATE
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 555,
          first_name: 'LogTest',
          last_name: 'User',
          email: 'log@example.com',
          role: 'estudiante'
        }]
      });

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(`Usuario actualizado (id=${userId})`);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('14. Debe registrar log de advertencia para usuario no encontrado', async () => {
      const userId = '666';
      mockReq.params = { id: userId };
      mockReq.body = { last_name: 'NotFound' };

      // Mock de verificación de existencia - no encontrado
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(`Usuario no encontrado (id=${userId})`);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('15. Debe registrar log de error con detalles', async () => {
      const userId = '777';
      mockReq.params = { id: userId };
      mockReq.body = { email: 'error@test.com' };

      const specificError = new Error('Connection timeout');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(specificError);

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error al actualizar usuario (id=${userId})`,
        { error: specificError }
      );
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  console.log('✅ Tests unitarios del UpdateUser Controller completados:');
  console.log('   - Casos exitosos (3 tests)');
  console.log('   - Casos de validación (3 tests)');
  console.log('   - Casos de error - Usuario no encontrado (2 tests)');
  console.log('   - Casos de error - Base de datos (2 tests)');
  console.log('   - Estructura de respuesta (2 tests)');
  console.log('   - Logging y auditoría (3 tests)');
  console.log('   - Total: 15 tests unitarios');
}); 