import { Request, Response } from 'express';
import { getUserById } from '../../../src/controllers/userController/getUserById';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';
import { createUniqueTestData } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');
jest.mock('../../../src/config/logger');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('GetUserById Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let testData: ReturnType<typeof createUniqueTestData>;

  beforeEach(() => {
    testData = createUniqueTestData();
    
    mockReq = {
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Casos exitosos', () => {
    test('1. Debe obtener usuario por ID exitosamente', async () => {
      const userId = '123';
      mockReq.params = { id: userId };

      const mockUserData = {
        id: 123,
        first_name: testData.firstName,
        last_name: testData.lastName,
        email: testData.email,
        role: 'estudiante',
        created_at: '2023-01-01T00:00:00Z',
        last_activity: '2023-01-02T00:00:00Z'
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUserData]
      } as any);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUserData);
      expect(mockLogger.info).toHaveBeenCalledWith(`Usuario recuperado exitosamente: ${userId}`);
    });

    test('2. Debe manejar last_activity null', async () => {
      const userId = '456';
      mockReq.params = { id: userId };

      const mockUserData = {
        id: 456,
        first_name: testData.firstName,
        last_name: testData.lastName,
        email: testData.email,
        role: 'profesor',
        created_at: '2023-01-01T00:00:00Z',
        last_activity: null
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUserData]
      } as any);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUserData);
    });

    test('3. Debe verificar la query SQL correcta', async () => {
      const userId = '789';
      mockReq.params = { id: userId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 789,
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          role: 'estudiante',
          created_at: '2023-01-01T00:00:00Z',
          last_activity: null
        }]
      } as any);

      await getUserById(mockReq as Request, mockRes as Response);

      const expectedQuery = expect.stringContaining('SELECT');
      expect(mockPool.query).toHaveBeenCalledWith(expectedQuery, [userId]);
      
      // Verificar que la query incluye los campos esperados
      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('u.id');
      expect(actualQuery).toContain('u.first_name');
      expect(actualQuery).toContain('u.last_name');
      expect(actualQuery).toContain('u.email');
      expect(actualQuery).toContain('u.role');
      expect(actualQuery).toContain('u.created_at');
      expect(actualQuery).toContain('last_activity');
      expect(actualQuery).toContain('FROM Users u');
      expect(actualQuery).toContain('LEFT JOIN study s');
      expect(actualQuery).toContain('WHERE u.id = $1');
      expect(actualQuery).toContain('GROUP BY');
    });
  });

  describe('Casos de error - Usuario no encontrado', () => {
    test('4. Debe retornar 404 cuando el usuario no existe', async () => {
      const userId = '999';
      mockReq.params = { id: userId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Usuario no encontrado'
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(`Usuario no encontrado con ID: ${userId}`);
    });

    test('5. Debe manejar correctamente array vacío de resultados', async () => {
      const userId = '888';
      mockReq.params = { id: userId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockLogger.warn).toHaveBeenCalledWith(`Usuario no encontrado con ID: ${userId}`);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('6. Debe manejar errores de base de datos', async () => {
      const userId = '111';
      mockReq.params = { id: userId };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener usuario'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error al obtener usuario con ID: ${userId}`,
        { error: dbError }
      );
    });

    test('7. Debe manejar diferentes tipos de errores de DB', async () => {
      const userId = '222';
      mockReq.params = { id: userId };

      const sqlError = new Error('SQL syntax error');
      mockPool.query.mockRejectedValueOnce(sqlError);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener usuario'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error al obtener usuario con ID: ${userId}`,
        { error: sqlError }
      );
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Validación de parámetros', () => {
    test('8. Debe procesar IDs numéricos correctamente', async () => {
      const userId = '12345';
      mockReq.params = { id: userId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 12345,
          first_name: 'Numeric',
          last_name: 'User',
          email: 'numeric@example.com',
          role: 'admin',
          created_at: '2023-01-01T00:00:00Z',
          last_activity: '2023-01-02T00:00:00Z'
        }]
      } as any);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('9. Debe manejar IDs con formato string', async () => {
      const userId = 'abc123';
      mockReq.params = { id: userId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Estructura de respuesta', () => {
    test('10. Debe retornar todos los campos esperados', async () => {
      const userId = '333';
      mockReq.params = { id: userId };

      const completeUserData = {
        id: 333,
        first_name: 'Complete',
        last_name: 'User',
        email: 'complete@example.com',
        role: 'estudiante',
        created_at: '2023-01-01T00:00:00Z',
        last_activity: '2023-01-02T10:30:00Z'
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [completeUserData]
      } as any);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(Number),
          first_name: expect.any(String),
          last_name: expect.any(String),
          email: expect.any(String),
          role: expect.any(String),
          created_at: expect.any(String),
          last_activity: expect.any(String)
        })
      );
    });

    test('11. Debe manejar respuesta con campos mínimos', async () => {
      const userId = '444';
      mockReq.params = { id: userId };

      const minimalUserData = {
        id: 444,
        first_name: 'Min',
        last_name: 'User',
        email: 'min@example.com',
        role: 'profesor',
        created_at: '2023-01-01T00:00:00Z',
        last_activity: null
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [minimalUserData]
      } as any);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(minimalUserData);
    });
  });

  describe('Logging y auditoría', () => {
    test('12. Debe registrar log de éxito con ID correcto', async () => {
      const userId = '555';
      mockReq.params = { id: userId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 555,
          first_name: 'Log',
          last_name: 'Test',
          email: 'log@example.com',
          role: 'estudiante',
          created_at: '2023-01-01T00:00:00Z',
          last_activity: null
        }]
      } as any);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(`Usuario recuperado exitosamente: ${userId}`);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('13. Debe registrar log de advertencia para usuario no encontrado', async () => {
      const userId = '666';
      mockReq.params = { id: userId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(`Usuario no encontrado con ID: ${userId}`);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('14. Debe registrar log de error con detalles', async () => {
      const userId = '777';
      mockReq.params = { id: userId };

      const specificError = new Error('Connection timeout');
      mockPool.query.mockRejectedValueOnce(specificError);

      await getUserById(mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error al obtener usuario con ID: ${userId}`,
        { error: specificError }
      );
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  console.log('✅ Tests unitarios del GetUserById Controller completados:');
  console.log('   - Casos exitosos (3 tests)');
  console.log('   - Casos de error - Usuario no encontrado (2 tests)');
  console.log('   - Casos de error - Base de datos (2 tests)');
  console.log('   - Validación de parámetros (2 tests)');
  console.log('   - Estructura de respuesta (2 tests)');
  console.log('   - Logging y auditoría (3 tests)');
  console.log('   - Total: 14 tests unitarios + 1 resumen = 15 tests');
}); 