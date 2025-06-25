import { Request, Response, NextFunction } from 'express';
import { getEvaluations } from '../../../src/controllers/evaluationController/getEvaluations';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';

// Mock de las dependencias
jest.mock('../../../src/config/db');
jest.mock('../../../src/config/logger');

describe('GetEvaluations Unit Tests', () => {
  let mockReq: Partial<Request & { user?: any }>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  const mockPool = pool as jest.Mocked<typeof pool>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    mockReq = {
      user: { id: 1 }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn(() => mockRes as Response)
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
    
    // Mock console.log
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Casos exitosos', () => {
    test('1. Debe retornar todas las evaluaciones de un profesor', async () => {
      const mockEvaluations = [
        {
          id: 1,
          study_id: 101,
          teacher_id: 1,
          submitted_at: new Date('2024-01-15T10:30:00Z'),
          score: 8,
          feedback_summary: 'Buen trabajo',
          title: 'Estudio Cardiovascular',
          created_at: new Date('2024-01-10T09:00:00Z'),
          student_first_name: 'Juan',
          student_last_name: 'Pérez',
          teacher_name: 'Dr. María González'
        },
        {
          id: 2,
          study_id: 102,
          teacher_id: 1,
          submitted_at: new Date('2024-01-16T11:00:00Z'),
          score: 9,
          feedback_summary: 'Excelente diagnóstico',
          title: 'Estudio Respiratorio',
          created_at: new Date('2024-01-11T10:00:00Z'),
          student_first_name: 'Ana',
          student_last_name: 'López',
          teacher_name: 'Dr. María González'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await getEvaluations(mockReq as Request & { user?: any }, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
      expect(console.log).toHaveBeenCalledWith('Evaluaciones devueltas:', mockEvaluations);
      expect(mockRes.json).toHaveBeenCalledWith({
        evaluations: mockEvaluations
      });
    });

    test('2. Debe usar el teacherId del usuario autenticado', async () => {
      mockReq.user = { id: 99 };
      const mockEvaluations = [];

      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await getEvaluations(mockReq as Request & { user?: any }, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ef.teacher_id = $1'),
        [99]
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        evaluations: mockEvaluations
      });
    });

    test('3. Debe incluir información completa del estudiante y profesor', async () => {
      const mockEvaluations = [
        {
          id: 3,
          study_id: 103,
          teacher_id: 1,
          submitted_at: new Date(),
          score: 7,
          feedback_summary: 'Puede mejorar',
          title: 'Estudio Neurológico',
          created_at: new Date(),
          student_first_name: 'Carlos',
          student_last_name: 'Martín',
          teacher_name: 'Dr. Pedro Ruiz'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await getEvaluations(mockReq as Request & { user?: any }, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN study s ON ef.study_id = s.id'),
        [1]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN users stu ON s.student_id = stu.id'),
        [1]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN users tea ON ef.teacher_id = tea.id'),
        [1]
      );
    });

    test('4. Debe ordenar por submitted_at DESC', async () => {
      const mockEvaluations = [];
      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await getEvaluations(mockReq as Request & { user?: any }, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY ef.submitted_at DESC'),
        [1]
      );
    });

    test('5. Debe retornar array vacío cuando no hay evaluaciones', async () => {
      const mockEvaluations = [];

      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await getEvaluations(mockReq as Request & { user?: any }, mockRes as Response, mockNext);

      expect(console.log).toHaveBeenCalledWith('Evaluaciones devueltas:', []);
      expect(mockRes.json).toHaveBeenCalledWith({
        evaluations: []
      });
    });

    test('6. Debe concatenar nombre completo del profesor', async () => {
      const mockEvaluations = [
        {
          id: 4,
          study_id: 104,
          teacher_id: 1,
          submitted_at: new Date(),
          score: 10,
          feedback_summary: 'Perfecto',
          title: 'Estudio Test',
          created_at: new Date(),
          student_first_name: 'Luis',
          student_last_name: 'García',
          teacher_name: 'Dr. Ana María Fernández'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await getEvaluations(mockReq as Request & { user?: any }, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("tea.first_name || ' ' || tea.last_name AS teacher_name"),
        [1]
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        evaluations: mockEvaluations
      });
    });
  });

  describe('Casos de error', () => {
    test('7. Debe manejar errores de base de datos', async () => {
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await getEvaluations(mockReq as Request & { user?: any }, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Error al obtener evaluaciones', { error: dbError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener evaluaciones'
      });
    });

    test('8. Debe manejar errores SQL específicos', async () => {
      const sqlError = new Error('relation "evaluation_form" does not exist');
      mockPool.query.mockRejectedValueOnce(sqlError);

      await getEvaluations(mockReq as Request & { user?: any }, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Error al obtener evaluaciones', { error: sqlError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener evaluaciones'
      });
    });

    test('9. Debe manejar timeout de conexión', async () => {
      const timeoutError = new Error('Connection timeout');
      mockPool.query.mockRejectedValueOnce(timeoutError);

      await getEvaluations(mockReq as Request & { user?: any }, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Error al obtener evaluaciones', { error: timeoutError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener evaluaciones'
      });
    });
  });

  describe('Casos edge', () => {
    test('10. Debe manejar teacherId como string en user', async () => {
      mockReq.user = { id: '123' };
      const mockEvaluations = [];

      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await getEvaluations(mockReq as Request & { user?: any }, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ef.teacher_id = $1'),
        ['123']
      );
    });

    test('11. Debe verificar estructura completa de la query', async () => {
      const mockEvaluations = [];
      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await getEvaluations(mockReq as Request & { user?: any }, mockRes as Response, mockNext);

      const expectedFields = [
        'ef.id',
        'ef.study_id',
        'ef.teacher_id',
        'ef.submitted_at',
        'ef.score',
        'ef.feedback_summary',
        's.title',
        's.created_at',
        'stu.first_name AS student_first_name',
        'stu.last_name AS student_last_name',
        "tea.first_name || ' ' || tea.last_name AS teacher_name"
      ];

      for (const field of expectedFields) {
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining(field),
          [1]
        );
      }
    });

    test('12. Debe loggear las evaluaciones devueltas correctamente', async () => {
      const mockEvaluations = [
        { id: 1, score: 8, feedback_summary: 'Test feedback' },
        { id: 2, score: 9, feedback_summary: 'Another test' }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockEvaluations
      } as any);

      await getEvaluations(mockReq as Request & { user?: any }, mockRes as Response, mockNext);

      expect(console.log).toHaveBeenCalledWith('Evaluaciones devueltas:', mockEvaluations);
      expect(mockRes.json).toHaveBeenCalledWith({
        evaluations: mockEvaluations
      });
    });
  });
}); 