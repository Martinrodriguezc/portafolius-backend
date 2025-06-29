import { Request, Response } from 'express';
import { getEvaluationByStudy } from '../../../src/controllers/evaluationController/getEvaluationByStudy';
import { pool } from '../../../src/config/db';

// Mock de las dependencias
jest.mock('../../../src/config/db');

describe('GetEvaluationByStudy Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  const mockPool = pool as jest.Mocked<typeof pool>;

  beforeEach(() => {
    mockReq = {
      params: { studyId: '123' }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn(() => mockRes as Response)
    };

    jest.clearAllMocks();
    
    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Casos exitosos', () => {
    test('1. Debe retornar evaluación encontrada para studyId válido', async () => {
      const mockEvaluationData = {
        id: 1,
        study_id: 123,
        score: 8,
        feedback_summary: 'Buen trabajo',
        submitted_at: new Date(),
        teacher_first_name: 'Juan',
        teacher_last_name: 'Pérez'
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockEvaluationData]
      } as any);

      await getEvaluationByStudy(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['123']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        evaluation: mockEvaluationData
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('2. Debe usar ORDER BY submitted_at DESC LIMIT 1', async () => {
      const mockEvaluationData = {
        id: 2,
        study_id: 123,
        score: 9,
        feedback_summary: 'Excelente',
        submitted_at: new Date(),
        teacher_first_name: 'María',
        teacher_last_name: 'González'
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockEvaluationData]
      } as any);

      await getEvaluationByStudy(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/ORDER BY.*submitted_at DESC.*LIMIT 1/s),
        ['123']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        evaluation: mockEvaluationData
      });
    });

    test('3. Debe incluir JOIN con users para obtener datos del profesor', async () => {
      const mockEvaluationData = {
        id: 3,
        study_id: 123,
        score: 7,
        feedback_summary: 'Necesita mejorar',
        submitted_at: new Date(),
        teacher_first_name: 'Carlos',
        teacher_last_name: 'López'
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockEvaluationData]
      } as any);

      await getEvaluationByStudy(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN users u ON u.id = ef.teacher_id'),
        ['123']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        evaluation: mockEvaluationData
      });
    });
  });

  describe('Casos de error', () => {
    test('4. Debe retornar 404 cuando no se encuentra evaluación', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await getEvaluationByStudy(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['123']
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'No se encontró evaluación para este estudio'
      });
    });

    test('5. Debe manejar errores de base de datos', async () => {
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await getEvaluationByStudy(mockReq as Request, mockRes as Response);

      expect(console.error).toHaveBeenCalledWith(
        'Error al obtener evaluación por studyId:',
        dbError
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener evaluación'
      });
    });

    test('6. Debe manejar studyId con caracteres especiales', async () => {
      mockReq.params = { studyId: '456abc' };

      const mockEvaluationData = {
        id: 4,
        study_id: 456,
        score: 8,
        feedback_summary: 'Bien',
        submitted_at: new Date(),
        teacher_first_name: 'Ana',
        teacher_last_name: 'Martín'
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockEvaluationData]
      } as any);

      await getEvaluationByStudy(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['456abc']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        evaluation: mockEvaluationData
      });
    });

    test('7. Debe manejar errores SQL específicos', async () => {
      const sqlError = new Error('column "nonexistent" does not exist');
      mockPool.query.mockRejectedValueOnce(sqlError);

      await getEvaluationByStudy(mockReq as Request, mockRes as Response);

      expect(console.error).toHaveBeenCalledWith(
        'Error al obtener evaluación por studyId:',
        sqlError
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener evaluación'
      });
    });
  });

  describe('Casos edge', () => {
    test('8. Debe manejar studyId numérico como string', async () => {
      mockReq.params = { studyId: '999' };

      const mockEvaluationData = {
        id: 5,
        study_id: 999,
        score: 10,
        feedback_summary: 'Perfecto',
        submitted_at: new Date(),
        teacher_first_name: 'Pedro',
        teacher_last_name: 'Ruiz'
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockEvaluationData]
      } as any);

      await getEvaluationByStudy(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ef.study_id = $1'),
        ['999']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        evaluation: mockEvaluationData
      });
    });

    test('9. Debe verificar que se retorna la estructura correcta de datos', async () => {
      const mockEvaluationData = {
        id: 6,
        study_id: 123,
        score: 5,
        feedback_summary: 'Regular',
        submitted_at: new Date('2024-01-15T10:30:00Z'),
        teacher_first_name: 'Laura',
        teacher_last_name: 'Torres'
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockEvaluationData]
      } as any);

      await getEvaluationByStudy(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        evaluation: expect.objectContaining({
          id: expect.any(Number),
          study_id: expect.any(Number),
          score: expect.any(Number),
          feedback_summary: expect.any(String),
          submitted_at: expect.any(Date),
          teacher_first_name: expect.any(String),
          teacher_last_name: expect.any(String)
        })
      });
    });

    test('10. Debe retornar solo la evaluación más reciente cuando hay múltiples', async () => {
      const latestEvaluation = {
        id: 7,
        study_id: 123,
        score: 9,
        feedback_summary: 'Última evaluación',
        submitted_at: new Date('2024-01-20T15:00:00Z'),
        teacher_first_name: 'Roberto',
        teacher_last_name: 'Herrera'
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [latestEvaluation]
      } as any);

      await getEvaluationByStudy(mockReq as Request, mockRes as Response);

      // Verifica que se use LIMIT 1 para retornar solo una evaluación
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/LIMIT 1/),
        ['123']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        evaluation: latestEvaluation
      });
    });
  });
}); 