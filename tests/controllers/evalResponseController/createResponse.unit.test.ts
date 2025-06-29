import { Request, Response } from 'express';
import { createResponse } from '../../../src/controllers/evalResponseController/createResponse';
import { pool } from '../../../src/config/db';
import { createUniqueTestData } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');

const mockPool = pool as jest.Mocked<typeof pool>;

describe('CreateResponse Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let testData: ReturnType<typeof createUniqueTestData>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    testData = {
      ...createUniqueTestData(),
      attemptId: 123,
      protocolItemId: 456
    };
    
    mockReq = {
      params: {},
      body: {}
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
    test('1. Debe crear respuesta de evaluación exitosamente', async () => {
      const attemptId = '123';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 8
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO evaluation_response'),
        [123, testData.protocolItemId, 8]
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Respuesta guardada'
      });
    });

    test('2. Debe manejar scores decimales correctamente', async () => {
      const attemptId = '124';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 7.5
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [124, testData.protocolItemId, 7.5]
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    test('3. Debe manejar score 0 correctamente', async () => {
      const attemptId = '125';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 0
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [125, testData.protocolItemId, 0]
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    test('4. Debe convertir attemptId string a número correctamente', async () => {
      const attemptId = '999';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: 789,
        score: 5
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [999, 789, 5]
      );
    });

    test('5. Debe usar ON CONFLICT DO UPDATE en la query', async () => {
      const attemptId = '126';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 9
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('INSERT INTO evaluation_response');
      expect(actualQuery).toContain('attempt_id, protocol_item_id, score');
      expect(actualQuery).toContain('VALUES ($1, $2, $3)');
      expect(actualQuery).toContain('ON CONFLICT (attempt_id, protocol_item_id) DO UPDATE');
      expect(actualQuery).toContain('SET score = EXCLUDED.score');
    });

    test('6. Debe manejar scores altos correctamente', async () => {
      const attemptId = '127';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 100
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [127, testData.protocolItemId, 100]
      );
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('7. Debe manejar errores de base de datos', async () => {
      const attemptId = '128';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 6
      };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al crear response:', dbError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al guardar respuesta'
      });
    });

    test('8. Debe manejar errores de constraint violation', async () => {
      const attemptId = '129';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 7
      };

      const constraintError = new Error('Foreign key constraint violation');
      mockPool.query.mockRejectedValueOnce(constraintError);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al crear response:', constraintError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al guardar respuesta'
      });
    });

    test('9. Debe manejar timeout de base de datos', async () => {
      const attemptId = '130';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 4
      };

      const timeoutError = new Error('Connection timeout');
      mockPool.query.mockRejectedValueOnce(timeoutError);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al crear response:', timeoutError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('10. Debe manejar errores SQL específicos', async () => {
      const attemptId = '131';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 3
      };

      const sqlError = new Error('SQL syntax error');
      mockPool.query.mockRejectedValueOnce(sqlError);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al crear response:', sqlError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Casos edge cases', () => {
    test('11. Debe manejar attemptId con ceros al inicio', async () => {
      const attemptId = '00132';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 8
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [132, testData.protocolItemId, 8]
      );
    });

    test('12. Debe manejar protocol_item_id muy grande', async () => {
      const attemptId = '133';
      const largeItemId = 999999999;
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: largeItemId,
        score: 5
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [133, largeItemId, 5]
      );
    });

    test('13. Debe manejar scores negativos', async () => {
      const attemptId = '134';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: -1
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [134, testData.protocolItemId, -1]
      );
    });

    test('14. Debe manejar attemptId no numérico', async () => {
      const attemptId = 'invalid-id';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 6
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      // Number('invalid-id') retorna NaN
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [NaN, testData.protocolItemId, 6]
      );
    });

    test('15. Debe manejar protocol_item_id como string', async () => {
      const attemptId = '135';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: '789', // Como string
        score: 7
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [135, '789', 7] // Se mantiene como string
      );
    });

    test('16. Debe manejar score como string numérico', async () => {
      const attemptId = '136';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: '8' // Como string
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [136, testData.protocolItemId, '8'] // Se mantiene como string
      );
    });
  });

  describe('Verificación de parámetros', () => {
    test('17. Debe usar los parámetros en el orden correcto', async () => {
      const attemptId = '137';
      const protocolItemId = 999;
      const score = 10;
      
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: protocolItemId,
        score: score
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [137, protocolItemId, score] // Orden: attemptId, protocol_item_id, score
      );
    });

    test('18. Debe extraer parámetros del lugar correcto', async () => {
      const attemptId = '138';
      mockReq.params = { attemptId, otherParam: 'ignored' };
      mockReq.body = {
        protocol_item_id: 555,
        score: 9,
        extraField: 'should be ignored'
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [138, 555, 9] // Solo los campos requeridos
      );
    });
  });

  describe('Estructura de respuesta', () => {
    test('19. Debe retornar estructura correcta en éxito', async () => {
      const attemptId = '139';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 8
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Respuesta guardada'
      });
    });

    test('20. Debe retornar estructura correcta en error', async () => {
      const attemptId = '140';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 6
      };

      const dbError = new Error('DB Error');
      mockPool.query.mockRejectedValueOnce(dbError);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al guardar respuesta'
      });
    });
  });

  describe('Verificación de logging', () => {
    test('21. Debe logear errores correctamente', async () => {
      const attemptId = '141';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 5
      };

      const specificError = new Error('Specific database error');
      mockPool.query.mockRejectedValueOnce(specificError);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error al crear response:',
        specificError
      );
    });

    test('22. No debe logear nada en casos exitosos', async () => {
      const attemptId = '142';
      mockReq.params = { attemptId };
      mockReq.body = {
        protocol_item_id: testData.protocolItemId,
        score: 7
      };

      mockPool.query.mockResolvedValueOnce({} as any);

      await createResponse(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
}); 