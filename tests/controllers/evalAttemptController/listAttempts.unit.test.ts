import { Request, Response } from 'express';
import { listAttempts } from '../../../src/controllers/evalAttemptController/listAttempts';
import { pool } from '../../../src/config/db';
import { createUniqueTestData } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');

const mockPool = pool as jest.Mocked<typeof pool>;

describe('ListAttempts Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let testData: ReturnType<typeof createUniqueTestData>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    testData = {
      ...createUniqueTestData(),
      clipId: 123,
      teacherId: 456
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
    test('1. Debe listar intentos de evaluación exitosamente', async () => {
      const clipId = '123';
      mockReq.params = { clipId };

      const mockAttempts = [
        {
          id: 1,
          submitted_at: '2023-01-01T10:00:00Z',
          total_score: 85,
          teacher_name: `Teacher ${testData.timestamp}`,
          comment: 'Excellent performance'
        },
        {
          id: 2,
          submitted_at: '2023-01-02T11:00:00Z',
          total_score: 75,
          teacher_name: `Another Teacher ${testData.timestamp}`,
          comment: 'Good work'
        },
        {
          id: 3,
          submitted_at: '2023-01-03T12:00:00Z',
          total_score: 90,
          teacher_name: `Third Teacher ${testData.timestamp}`,
          comment: null
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockAttempts
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT ea.id'),
        [123]
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        attempts: mockAttempts
      });
    });

    test('2. Debe manejar lista vacía de intentos', async () => {
      const clipId = '456';
      mockReq.params = { clipId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        attempts: []
      });
    });

    test('3. Debe convertir clipId a número correctamente', async () => {
      const clipId = '789';
      mockReq.params = { clipId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [789]
      );
    });

    test('4. Debe verificar la query SQL correcta', async () => {
      const clipId = '111';
      mockReq.params = { clipId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('SELECT ea.id');
      expect(actualQuery).toContain('ea.submitted_at');
      expect(actualQuery).toContain('COALESCE(SUM(er.score), 0) AS total_score');
      expect(actualQuery).toContain('CONCAT(u.first_name, \' \', u.last_name) AS teacher_name');
      expect(actualQuery).toContain('ea.comment');
      expect(actualQuery).toContain('FROM evaluation_attempt ea');
      expect(actualQuery).toContain('LEFT JOIN evaluation_response er');
      expect(actualQuery).toContain('JOIN "users" u');
      expect(actualQuery).toContain('WHERE ea.clip_id = $1');
      expect(actualQuery).toContain('GROUP BY ea.id, teacher_name, ea.comment');
      expect(actualQuery).toContain('ORDER BY ea.submitted_at DESC');
    });

    test('5. Debe ordenar por fecha de envío descendente', async () => {
      const clipId = '222';
      mockReq.params = { clipId };

      const mockAttempts = [
        {
          id: 3,
          submitted_at: '2023-01-03T12:00:00Z',
          total_score: 90,
          teacher_name: 'Recent Teacher',
          comment: 'Latest attempt'
        },
        {
          id: 1,
          submitted_at: '2023-01-01T10:00:00Z',
          total_score: 85,
          teacher_name: 'Earlier Teacher',
          comment: 'Earlier attempt'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockAttempts
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('ORDER BY ea.submitted_at DESC');
      expect(mockRes.json).toHaveBeenCalledWith({
        attempts: mockAttempts
      });
    });

    test('6. Debe manejar scores con COALESCE correctamente', async () => {
      const clipId = '333';
      mockReq.params = { clipId };

      const mockAttempts = [
        {
          id: 1,
          submitted_at: '2023-01-01T10:00:00Z',
          total_score: 0, // Sin respuestas, COALESCE devuelve 0
          teacher_name: 'Teacher Name',
          comment: 'No responses yet'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockAttempts
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('COALESCE(SUM(er.score), 0)');
      expect(mockRes.json).toHaveBeenCalledWith({
        attempts: mockAttempts
      });
    });
  });

  describe('Casos de error - Conversión de parámetros', () => {
    test('7. Debe manejar clipId no numérico', async () => {
      const clipId = 'invalid-id';
      mockReq.params = { clipId };

      // Number('invalid-id') retorna NaN
      await listAttempts(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [NaN]
      );
      // La query probablemente fallará con NaN, pero el código no valida esto
    });

    test('8. Debe manejar clipId vacío', async () => {
      const clipId = '';
      mockReq.params = { clipId };

      // Number('') retorna 0
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [0]
      );
    });

    test('9. Debe manejar clipId con ceros al inicio', async () => {
      const clipId = '00123';
      mockReq.params = { clipId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [123]
      );
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('10. Debe manejar errores de base de datos', async () => {
      const clipId = '444';
      mockReq.params = { clipId };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith(dbError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al listar intentos'
      });
    });

    test('11. Debe manejar errores SQL específicos', async () => {
      const clipId = '555';
      mockReq.params = { clipId };

      const sqlError = new Error('SQL syntax error');
      mockPool.query.mockRejectedValueOnce(sqlError);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith(sqlError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al listar intentos'
      });
    });

    test('12. Debe manejar timeout de base de datos', async () => {
      const clipId = '666';
      mockReq.params = { clipId };

      const timeoutError = new Error('Connection timeout');
      mockPool.query.mockRejectedValueOnce(timeoutError);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith(timeoutError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al listar intentos'
      });
    });

    test('13. Debe manejar errores de permisos', async () => {
      const clipId = '777';
      mockReq.params = { clipId };

      const permissionError = new Error('Permission denied for table evaluation_attempt');
      mockPool.query.mockRejectedValueOnce(permissionError);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith(permissionError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al listar intentos'
      });
    });
  });

  describe('Casos edge cases', () => {
    test('14. Debe manejar intentos con comentarios null', async () => {
      const clipId = '888';
      mockReq.params = { clipId };

      const mockAttempts = [
        {
          id: 1,
          submitted_at: '2023-01-01T10:00:00Z',
          total_score: 85,
          teacher_name: 'Teacher Name',
          comment: null
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockAttempts
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        attempts: mockAttempts
      });
    });

    test('15. Debe manejar nombres de teacher con espacios especiales', async () => {
      const clipId = '999';
      mockReq.params = { clipId };

      const mockAttempts = [
        {
          id: 1,
          submitted_at: '2023-01-01T10:00:00Z',
          total_score: 85,
          teacher_name: 'Dr. María José García-López',
          comment: 'Excelente trabajo'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockAttempts
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        attempts: mockAttempts
      });
    });

    test('16. Debe manejar números grandes de clipId', async () => {
      const clipId = '999999999';
      mockReq.params = { clipId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [999999999]
      );
    });

    test('17. Debe manejar múltiples intentos del mismo teacher', async () => {
      const clipId = '1010';
      mockReq.params = { clipId };

      const mockAttempts = [
        {
          id: 1,
          submitted_at: '2023-01-02T11:00:00Z',
          total_score: 85,
          teacher_name: 'Same Teacher',
          comment: 'Second attempt'
        },
        {
          id: 2,
          submitted_at: '2023-01-01T10:00:00Z',
          total_score: 75,
          teacher_name: 'Same Teacher',
          comment: 'First attempt'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockAttempts
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        attempts: mockAttempts
      });
      // Verificar que están ordenados por fecha descendente
      expect(mockAttempts[0].submitted_at > mockAttempts[1].submitted_at).toBe(true);
    });

    test('18. Debe manejar scores decimales', async () => {
      const clipId = '1111';
      mockReq.params = { clipId };

      const mockAttempts = [
        {
          id: 1,
          submitted_at: '2023-01-01T10:00:00Z',
          total_score: 85.5,
          teacher_name: 'Teacher Name',
          comment: 'Decimal score'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockAttempts
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        attempts: mockAttempts
      });
    });
  });

  describe('Verificación de JOIN y GROUP BY', () => {
    test('19. Debe usar LEFT JOIN correctamente para evaluation_response', async () => {
      const clipId = '1212';
      mockReq.params = { clipId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('LEFT JOIN evaluation_response er ON er.attempt_id = ea.id');
    });

    test('20. Debe usar JOIN para obtener información del teacher', async () => {
      const clipId = '1313';
      mockReq.params = { clipId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('JOIN "users" u ON u.id = ea.teacher_id');
    });

    test('21. Debe usar GROUP BY correctamente', async () => {
      const clipId = '1414';
      mockReq.params = { clipId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('GROUP BY ea.id, teacher_name, ea.comment');
    });

    test('22. Debe usar CONCAT para crear teacher_name', async () => {
      const clipId = '1515';
      mockReq.params = { clipId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await listAttempts(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('CONCAT(u.first_name, \' \', u.last_name) AS teacher_name');
    });
  });
}); 