import { Request, Response } from 'express';
import { listResponses } from '../../../src/controllers/evalResponseController/listResponses';
import { pool } from '../../../src/config/db';
import { createUniqueTestData } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');

const mockPool = pool as jest.Mocked<typeof pool>;

describe('ListResponses Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let testData: ReturnType<typeof createUniqueTestData>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    testData = {
      ...createUniqueTestData(),
      attemptId: 123
    };
    
    mockReq = {
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Spy on console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Casos exitosos', () => {
    test('1. Debe listar respuestas exitosamente', async () => {
      const attemptId = '123';
      const mockResponses = [
        { protocol_item_id: 1, score: 8 },
        { protocol_item_id: 2, score: 6 },
        { protocol_item_id: 3, score: 9 }
      ];

      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: mockResponses } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT protocol_item_id, score'),
        [123]
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResponses);
    });

    test('2. Debe manejar lista vacía de respuestas', async () => {
      const attemptId = '124';
      const emptyRows: any[] = [];

      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: emptyRows } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [124]
      );
      expect(mockRes.json).toHaveBeenCalledWith(emptyRows);
    });

    test('3. Debe convertir attemptId string a número', async () => {
      const attemptId = '999';
      const mockResponses = [{ protocol_item_id: 5, score: 7 }];

      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: mockResponses } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [999] // Convertido a número
      );
    });

    test('4. Debe manejar múltiples respuestas con diferentes scores', async () => {
      const attemptId = '125';
      const mockResponses = [
        { protocol_item_id: 1, score: 0 },
        { protocol_item_id: 2, score: 10 },
        { protocol_item_id: 3, score: 5.5 },
        { protocol_item_id: 4, score: -1 }
      ];

      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: mockResponses } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockResponses);
    });

    test('5. Debe usar la query SQL correcta', async () => {
      const attemptId = '126';
      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('SELECT protocol_item_id, score');
      expect(actualQuery).toContain('FROM evaluation_response');
      expect(actualQuery).toContain('WHERE attempt_id = $1');
    });

    test('6. Debe manejar attemptId con ceros al inicio', async () => {
      const attemptId = '00127';
      const mockResponses = [{ protocol_item_id: 1, score: 3 }];

      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: mockResponses } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [127] // Ceros ignorados
      );
    });

    test('7. Debe retornar directamente los rows de la query', async () => {
      const attemptId = '128';
      const mockResponses = [
        { protocol_item_id: 10, score: 8.5 },
        { protocol_item_id: 11, score: 9.0 }
      ];

      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: mockResponses } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockResponses);
      expect(mockRes.status).not.toHaveBeenCalled(); // No se establece status explícitamente
    });

    test('8. Debe manejar protocol_item_id grandes', async () => {
      const attemptId = '129';
      const mockResponses = [
        { protocol_item_id: 999999999, score: 4 }
      ];

      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: mockResponses } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockResponses);
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('9. Debe manejar errores de base de datos', async () => {
      const attemptId = '130';
      mockReq.params = { attemptId };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al listar responses:', dbError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al listar respuestas'
      });
    });

    test('10. Debe manejar timeout de base de datos', async () => {
      const attemptId = '131';
      mockReq.params = { attemptId };

      const timeoutError = new Error('Connection timeout');
      mockPool.query.mockRejectedValueOnce(timeoutError);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al listar responses:', timeoutError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('11. Debe manejar errores SQL específicos', async () => {
      const attemptId = '132';
      mockReq.params = { attemptId };

      const sqlError = new Error('Invalid table name');
      mockPool.query.mockRejectedValueOnce(sqlError);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al listar responses:', sqlError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al listar respuestas'
      });
    });

    test('12. Debe manejar errores de permisos', async () => {
      const attemptId = '133';
      mockReq.params = { attemptId };

      const permissionError = new Error('Permission denied');
      mockPool.query.mockRejectedValueOnce(permissionError);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al listar responses:', permissionError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Casos edge cases', () => {
    test('13. Debe manejar attemptId no numérico', async () => {
      const attemptId = 'invalid-id';
      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      // Number('invalid-id') retorna NaN
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [NaN]
      );
    });

    test('14. Debe manejar attemptId muy grande', async () => {
      const attemptId = '999999999999';
      const mockResponses = [{ protocol_item_id: 1, score: 2 }];
      
      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: mockResponses } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [999999999999]
      );
    });

    test('15. Debe manejar respuestas con campos adicionales', async () => {
      const attemptId = '134';
      const mockResponses = [
        { 
          protocol_item_id: 1, 
          score: 8,
          extra_field: 'should be included' // Campo adicional
        }
      ];

      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: mockResponses } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockResponses);
    });

    test('16. Debe manejar scores como strings', async () => {
      const attemptId = '135';
      const mockResponses = [
        { protocol_item_id: 1, score: '8' }, // Score como string
        { protocol_item_id: 2, score: '6.5' }
      ];

      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: mockResponses } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockResponses);
    });

    test('17. Debe manejar scores null/undefined', async () => {
      const attemptId = '136';
      const mockResponses = [
        { protocol_item_id: 1, score: null },
        { protocol_item_id: 2, score: undefined }
      ];

      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: mockResponses } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockResponses);
    });
  });

  describe('Verificación de parámetros', () => {
    test('18. Debe usar solo attemptId como parámetro', async () => {
      const attemptId = '137';
      mockReq.params = { 
        attemptId, 
        otherParam: 'should be ignored' 
      };
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [137] // Solo attemptId
      );
    });

    test('19. Debe extraer attemptId del lugar correcto', async () => {
      const attemptId = '138';
      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [138]
      );
    });
  });

  describe('Estructura de respuesta', () => {
    test('20. Debe retornar array directamente en éxito', async () => {
      const attemptId = '139';
      const mockResponses = [{ protocol_item_id: 1, score: 5 }];
      
      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: mockResponses } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockResponses);
      // No se llama a status en caso exitoso
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('21. Debe retornar estructura de error correcta', async () => {
      const attemptId = '140';
      mockReq.params = { attemptId };

      const dbError = new Error('DB Error');
      mockPool.query.mockRejectedValueOnce(dbError);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al listar respuestas'
      });
    });
  });

  describe('Verificación de logging', () => {
    test('22. Debe logear errores correctamente', async () => {
      const attemptId = '141';
      mockReq.params = { attemptId };

      const specificError = new Error('Specific database error');
      mockPool.query.mockRejectedValueOnce(specificError);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error al listar responses:',
        specificError
      );
    });

    test('23. No debe logear nada en casos exitosos', async () => {
      const attemptId = '142';
      const mockResponses = [{ protocol_item_id: 1, score: 7 }];
      
      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: mockResponses } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Orden de campos en SELECT', () => {
    test('24. Debe seleccionar campos en orden correcto', async () => {
      const attemptId = '143';
      mockReq.params = { attemptId };
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await listResponses(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      // Verificar que protocol_item_id viene antes que score
      const itemIdIndex = actualQuery.indexOf('protocol_item_id');
      const scoreIndex = actualQuery.indexOf('score');
      expect(itemIdIndex).toBeLessThan(scoreIndex);
    });
  });
}); 