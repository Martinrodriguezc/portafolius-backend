import { Request, Response, NextFunction } from 'express';
import { listEvaluationsByStudent } from '../../../src/controllers/evaluationController/listEvaluationsByStudent';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';

// Mock de las dependencias
jest.mock('../../../src/config/db');
jest.mock('../../../src/config/logger');

describe('ListEvaluationsByStudent Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  const mockPool = pool as jest.Mocked<typeof pool>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    mockReq = {
      query: { studentId: '123' }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn(() => mockRes as Response)
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('Casos exitosos', () => {
    test('1. Debe retornar evaluaciones para studentId válido', async () => {
      const mockEvaluations = [
        {
          id: 1,
          study_id: 101,
          submitted_at: new Date('2024-01-15T10:30:00Z'),
          score: 8,
          feedback_summary: 'Buen trabajo en el diagnóstico'
        },
        {
          id: 2,
          study_id: 102,
          submitted_at: new Date('2024-01-16T11:00:00Z'),
          score: 9,
          feedback_summary: 'Excelente análisis'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [123]
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockEvaluations);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('2. Debe convertir studentId string a número', async () => {
      mockReq.query = { studentId: '456' };
      const mockEvaluations = [];

      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE s.student_id = $1'),
        [456]
      );
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    test('3. Debe incluir JOIN con study para filtrar por student_id', async () => {
      const mockEvaluations = [
        {
          id: 3,
          study_id: 103,
          submitted_at: new Date(),
          score: 7,
          feedback_summary: 'Puede mejorar'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN study s ON s.id = e.study_id'),
        [123]
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockEvaluations);
    });

    test('4. Debe seleccionar campos específicos de evaluación', async () => {
      const mockEvaluations = [];
      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      const expectedFields = [
        'e.id',
        'e.study_id',
        'e.submitted_at',
        'e.score',
        'e.feedback_summary'
      ];

      for (const field of expectedFields) {
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining(field),
          [123]
        );
      }
    });

    test('5. Debe retornar array vacío cuando no hay evaluaciones', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith([]);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('6. Debe manejar studentId numérico directamente', async () => {
      mockReq.query = { studentId: 789 };
      const mockEvaluations = [
        {
          id: 4,
          study_id: 104,
          submitted_at: new Date(),
          score: 10,
          feedback_summary: 'Perfecto'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE s.student_id = $1'),
        [789]
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockEvaluations);
    });
  });

  describe('Casos de validación', () => {
    test('7. Debe retornar 400 cuando studentId es undefined', async () => {
      mockReq.query = {};

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'studentId es requerido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('8. Debe retornar 400 cuando studentId es null', async () => {
      mockReq.query = { studentId: null };

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'studentId es requerido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('9. Debe retornar 400 cuando studentId es string vacío', async () => {
      mockReq.query = { studentId: '' };

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'studentId es requerido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('10. Debe retornar 400 cuando studentId es "0"', async () => {
      mockReq.query = { studentId: '0' };

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'studentId es requerido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('11. Debe retornar 400 cuando studentId es NaN', async () => {
      mockReq.query = { studentId: 'abc' };

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'studentId es requerido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Casos de error', () => {
    test('12. Debe manejar errores de base de datos', async () => {
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Error listando evaluaciones', { error: dbError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error listando evaluaciones'
      });
    });

    test('13. Debe manejar errores SQL específicos', async () => {
      const sqlError = new Error('relation "evaluation_form" does not exist');
      mockPool.query.mockRejectedValueOnce(sqlError);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Error listando evaluaciones', { error: sqlError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error listando evaluaciones'
      });
    });

    test('14. Debe manejar timeout de conexión', async () => {
      const timeoutError = new Error('Connection timeout');
      mockPool.query.mockRejectedValueOnce(timeoutError);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Error listando evaluaciones', { error: timeoutError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error listando evaluaciones'
      });
    });

    test('15. Debe manejar errores de foreign key', async () => {
      const fkError = new Error('violates foreign key constraint');
      mockPool.query.mockRejectedValueOnce(fkError);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Error listando evaluaciones', { error: fkError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error listando evaluaciones'
      });
    });
  });

  describe('Casos edge', () => {
    test('16. Debe verificar la query completa con alias correcto', async () => {
      const mockEvaluations = [];
      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM evaluation_form e'),
        [123]
      );
    });

    test('17. Debe manejar studentId con valor límite positivo alto', async () => {
      mockReq.query = { studentId: '999999999' };
      const mockEvaluations = [];

      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE s.student_id = $1'),
        [999999999]
      );
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    test('18. Debe verificar que no hay early return en caso exitoso', async () => {
      const mockEvaluations = [{ id: 1, study_id: 101, score: 8 }];
      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await listEvaluationsByStudent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(mockEvaluations);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
}); 