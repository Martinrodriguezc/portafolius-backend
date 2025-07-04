import { Request, Response } from 'express';
import { getAllTags } from '../../../src/controllers/videoController/getTags';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';
import { createUniqueTestData } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');
jest.mock('../../../src/config/logger');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('GetAllTags Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let testData: ReturnType<typeof createUniqueTestData>;

  beforeEach(() => {
    testData = createUniqueTestData();
    
    mockReq = {};

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Casos exitosos', () => {
    test('1. Debe obtener todos los tags exitosamente', async () => {
      const mockTags = [
        {
          id: 1,
          name: `tag1-${testData.timestamp}`,
          created_by: 1
        },
        {
          id: 2,
          name: `tag2-${testData.timestamp}`,
          created_by: 2
        },
        {
          id: 3,
          name: `tag3-${testData.timestamp}`,
          created_by: 1
        }
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockTags,
        rowCount: 3
      });

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        `SELECT id, name, created_by 
       FROM tag 
       ORDER BY name ASC`
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        tags: mockTags
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Se obtuvieron 3 tags');
    });

    test('2. Debe manejar lista vacía de tags', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        tags: []
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Se obtuvieron 0 tags');
    });

    test('3. Debe verificar el orden correcto (ORDER BY name ASC)', async () => {
      const mockTagsOrdered = [
        { id: 3, name: 'alpha-tag', created_by: 1 },
        { id: 1, name: 'beta-tag', created_by: 2 },
        { id: 2, name: 'gamma-tag', created_by: 1 }
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockTagsOrdered,
        rowCount: 3
      });

      await getAllTags(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('ORDER BY name ASC');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        tags: mockTagsOrdered
      });
    });

    test('4. Debe incluir todos los campos requeridos en la query', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      await getAllTags(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('SELECT id, name, created_by');
      expect(actualQuery).toContain('FROM tag');
      expect(actualQuery).toContain('ORDER BY name ASC');
    });

    test('5. Debe logear correctamente el número de resultados', async () => {
      const mockTags = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `tag-${i + 1}`,
        created_by: 1
      }));

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockTags,
        rowCount: 5
      });

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockLogger.info).toHaveBeenCalledWith('Se obtuvieron 5 tags');
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('6. Debe manejar errores de base de datos', async () => {
      const dbError = new Error('Database connection failed');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Error al obtener los tags'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener los tags',
        { error: dbError }
      );
    });

    test('7. Debe manejar errores SQL específicos', async () => {
      const sqlError = new Error('SQL syntax error');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(sqlError);

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Error al obtener los tags'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener los tags',
        { error: sqlError }
      );
    });

    test('8. Debe manejar timeout de base de datos', async () => {
      const timeoutError = new Error('Connection timeout');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(timeoutError);

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Error al obtener los tags'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener los tags',
        { error: timeoutError }
      );
    });

    test('9. Debe manejar errores de permisos de base de datos', async () => {
      const permissionError = new Error('Permission denied for table tag');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(permissionError);

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Error al obtener los tags'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al obtener los tags',
        { error: permissionError }
      );
    });
  });

  describe('Casos edge cases', () => {
    test('10. Debe manejar tags con nombres especiales', async () => {
      const specialTags = [
        { id: 1, name: 'tag with spaces', created_by: 1 },
        { id: 2, name: 'tag-with-dashes', created_by: 1 },
        { id: 3, name: 'tag_with_underscores', created_by: 1 },
        { id: 4, name: 'tag.with.dots', created_by: 1 },
        { id: 5, name: 'tag123', created_by: 1 }
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: specialTags,
        rowCount: 5
      });

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        tags: specialTags
      });
    });

    test('11. Debe manejar tags con nombres muy largos', async () => {
      const longTag = {
        id: 1,
        name: 'a'.repeat(255),
        created_by: 1
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [longTag],
        rowCount: 1
      });

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        tags: [longTag]
      });
    });

    test('12. Debe manejar valores null en created_by', async () => {
      const tagsWithNull = [
        { id: 1, name: 'tag1', created_by: null },
        { id: 2, name: 'tag2', created_by: 123 }
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: tagsWithNull,
        rowCount: 2
      });

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        tags: tagsWithNull
      });
    });

    test('13. Debe manejar gran cantidad de tags', async () => {
      const manyTags = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `tag-${String(i + 1).padStart(4, '0')}`,
        created_by: (i % 10) + 1
      }));

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: manyTags,
        rowCount: 1000
      });

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        tags: manyTags
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Se obtuvieron 1000 tags');
    });
  });

  describe('Verificación de respuesta', () => {
    test('14. Debe tener la estructura de respuesta correcta para éxito', async () => {
      const mockTags = [{ id: 1, name: 'test-tag', created_by: 1 }];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockTags,
        rowCount: 1
      });

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        tags: mockTags
      });
    });

    test('15. Debe tener la estructura de respuesta correcta para error', async () => {
      const dbError = new Error('Database error');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      await getAllTags(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Error al obtener los tags'
      });
    });

    test('16. No debe requerir parámetros en el request', async () => {
      // Verificar que funciona sin ningún parámetro
      const emptyReq = {} as Request;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      await getAllTags(emptyReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  console.log('✅ Tests unitarios del GetAllTags Controller completados:');
  console.log('   - Casos exitosos (5 tests)');
  console.log('   - Casos de error - Base de datos (4 tests)');
  console.log('   - Casos edge cases (4 tests)');
  console.log('   - Verificación de respuesta (3 tests)');
  console.log('   - Total: 16 tests unitarios');
}); 