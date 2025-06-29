import { Request, Response } from 'express';
import { updateEvaluation } from '../../../src/controllers/evaluationController/updateEvaluation';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';

// Mock de las dependencias
jest.mock('../../../src/config/db');
jest.mock('../../../src/config/logger');

describe('UpdateEvaluation Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  const mockPool = pool as jest.Mocked<typeof pool>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    mockReq = {
      params: { id: '1' },
      body: { score: 8, feedback_summary: 'Buen trabajo actualizado' },
      user: { id: 1 }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn(() => mockRes as Response)
    };

    jest.clearAllMocks();
  });

  describe('Casos exitosos', () => {
    test('1. Debe actualizar evaluación exitosamente', async () => {
      const mockExisting = {
        rows: [{ id: 1, teacher_id: 1, score: 7, feedback_summary: 'Trabajo anterior' }]
      };
      const mockUpdated = {
        rows: [{
          id: 1,
          study_id: 101,
          teacher_id: 1,
          submitted_at: new Date('2024-01-15T10:30:00Z'),
          score: 8,
          feedback_summary: 'Buen trabajo actualizado'
        }]
      };

      mockPool.query
        .mockResolvedValueOnce(mockExisting as any)
        .mockResolvedValueOnce(mockUpdated as any);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenNthCalledWith(1,
        'SELECT * FROM evaluation_form WHERE id = $1 AND teacher_id = $2',
        ['1', 1]
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE evaluation_form'),
        [8, 'Buen trabajo actualizado', '1']
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Evaluación actualizada: 1');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdated.rows[0]);
    });

    test('2. Debe verificar permisos del profesor antes de actualizar', async () => {
      const mockExisting = {
        rows: [{ id: 1, teacher_id: 1, score: 9, feedback_summary: 'Test' }]
      };
      const mockUpdated = {
        rows: [{
          id: 1,
          study_id: 102,
          teacher_id: 1,
          submitted_at: new Date(),
          score: 10,
          feedback_summary: 'Excelente actualizado'
        }]
      };

      mockReq.body = { score: 10, feedback_summary: 'Excelente actualizado' };

      mockPool.query
        .mockResolvedValueOnce(mockExisting as any)
        .mockResolvedValueOnce(mockUpdated as any);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenNthCalledWith(1,
        'SELECT * FROM evaluation_form WHERE id = $1 AND teacher_id = $2',
        ['1', 1]
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdated.rows[0]);
    });

    test('3. Debe actualizar con diferentes scores válidos', async () => {
      const testCases = [
        { score: 1, feedback: 'Needs improvement' },
        { score: 5, feedback: 'Average work' },
        { score: 10, feedback: 'Perfect work' }
      ];

      for (const testCase of testCases) {
        mockReq.body = { score: testCase.score, feedback_summary: testCase.feedback };

        const mockExisting = { rows: [{ id: 1, teacher_id: 1 }] };
        const mockUpdated = {
          rows: [{
            id: 1,
            study_id: 101,
            teacher_id: 1,
            submitted_at: new Date(),
            score: testCase.score,
            feedback_summary: testCase.feedback
          }]
        };

        mockPool.query
          .mockResolvedValueOnce(mockExisting as any)
          .mockResolvedValueOnce(mockUpdated as any);

        await updateEvaluation(mockReq as Request, mockRes as Response);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE evaluation_form'),
          [testCase.score, testCase.feedback, '1']
        );

        jest.clearAllMocks();
      }
    });

    test('4. Debe retornar todos los campos de la evaluación actualizada', async () => {
      const mockExisting = { rows: [{ id: 1, teacher_id: 1 }] };
      const completeUpdatedEvaluation = {
        id: 1,
        study_id: 101,
        teacher_id: 1,
        submitted_at: new Date('2024-01-15T10:30:00Z'),
        score: 8,
        feedback_summary: 'Feedback completo'
      };
      const mockUpdated = { rows: [completeUpdatedEvaluation] };

      mockPool.query
        .mockResolvedValueOnce(mockExisting as any)
        .mockResolvedValueOnce(mockUpdated as any);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('RETURNING id, study_id, teacher_id, submitted_at, score, feedback_summary'),
        [8, 'Buen trabajo actualizado', '1']
      );
      expect(mockRes.json).toHaveBeenCalledWith(completeUpdatedEvaluation);
    });
  });

  describe('Casos de validación de score', () => {
    test('5. Debe retornar 400 para score menor a 1', async () => {
      mockReq.body = { score: 0, feedback_summary: 'Test' };

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Score debe ser un número entre 1 y 10'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('6. Debe retornar 400 para score mayor a 10', async () => {
      mockReq.body = { score: 11, feedback_summary: 'Test' };

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Score debe ser un número entre 1 y 10'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('7. Debe retornar 400 para score no numérico', async () => {
      mockReq.body = { score: 'abc', feedback_summary: 'Test' };

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Score debe ser un número entre 1 y 10'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('8. Debe retornar 400 para score null', async () => {
      mockReq.body = { score: null, feedback_summary: 'Test' };

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Score debe ser un número entre 1 y 10'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('9. Debe retornar 400 para score undefined', async () => {
      mockReq.body = { feedback_summary: 'Test' };

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Score debe ser un número entre 1 y 10'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('10. Debe retornar 400 para score decimal fuera de rango', async () => {
      mockReq.body = { score: 10.5, feedback_summary: 'Test' };

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Score debe ser un número entre 1 y 10'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Casos de permisos', () => {
    test('11. Debe retornar 403 cuando evaluación no existe', async () => {
      const mockExisting = { rows: [] };
      mockPool.query.mockResolvedValueOnce(mockExisting as any);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM evaluation_form WHERE id = $1 AND teacher_id = $2',
        ['1', 1]
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'No tienes permiso para editar esta evaluación'
      });
    });

    test('12. Debe retornar 403 cuando teacher_id no coincide', async () => {
      mockReq.user = { id: 2 }; // Diferente teacher_id
      const mockExisting = { rows: [] }; // No encuentra la evaluación para este profesor
      mockPool.query.mockResolvedValueOnce(mockExisting as any);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM evaluation_form WHERE id = $1 AND teacher_id = $2',
        ['1', 2]
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'No tienes permiso para editar esta evaluación'
      });
    });

    test('13. Debe usar teacherId del token de usuario', async () => {
      mockReq.user = { id: 99 };
      const mockExisting = { rows: [{ id: 1, teacher_id: 99 }] };
      const mockUpdated = { rows: [{ id: 1, teacher_id: 99, score: 8 }] };

      mockPool.query
        .mockResolvedValueOnce(mockExisting as any)
        .mockResolvedValueOnce(mockUpdated as any);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenNthCalledWith(1,
        'SELECT * FROM evaluation_form WHERE id = $1 AND teacher_id = $2',
        ['1', 99]
      );
    });
  });

  describe('Casos de error', () => {
    test('14. Debe manejar errores en consulta de verificación', async () => {
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledWith('Error al actualizar evaluación', { error: dbError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al actualizar evaluación'
      });
    });

    test('15. Debe manejar errores en consulta de actualización', async () => {
      const mockExisting = { rows: [{ id: 1, teacher_id: 1 }] };
      const updateError = new Error('Update query failed');

      mockPool.query
        .mockResolvedValueOnce(mockExisting as any)
        .mockRejectedValueOnce(updateError);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledWith('Error al actualizar evaluación', { error: updateError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al actualizar evaluación'
      });
    });

    test('16. Debe manejar errores SQL específicos', async () => {
      const mockExisting = { rows: [{ id: 1, teacher_id: 1 }] };
      const sqlError = new Error('column "nonexistent" does not exist');

      mockPool.query
        .mockResolvedValueOnce(mockExisting as any)
        .mockRejectedValueOnce(sqlError);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledWith('Error al actualizar evaluación', { error: sqlError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al actualizar evaluación'
      });
    });

    test('17. Debe manejar timeout de conexión', async () => {
      const timeoutError = new Error('Connection timeout');
      mockPool.query.mockRejectedValueOnce(timeoutError);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledWith('Error al actualizar evaluación', { error: timeoutError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al actualizar evaluación'
      });
    });
  });

  describe('Casos edge', () => {
    test('18. Debe manejar id como string en params', async () => {
      mockReq.params = { id: '999' };
      const mockExisting = { rows: [{ id: 999, teacher_id: 1 }] };
      const mockUpdated = { rows: [{ id: 999, score: 8 }] };

      mockPool.query
        .mockResolvedValueOnce(mockExisting as any)
        .mockResolvedValueOnce(mockUpdated as any);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenNthCalledWith(1,
        'SELECT * FROM evaluation_form WHERE id = $1 AND teacher_id = $2',
        ['999', 1]
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('WHERE id = $3'),
        [8, 'Buen trabajo actualizado', '999']
      );
    });

    test('19. Debe verificar estructura exacta de la query UPDATE', async () => {
      const mockExisting = { rows: [{ id: 1, teacher_id: 1 }] };
      const mockUpdated = { rows: [{ id: 1 }] };

      mockPool.query
        .mockResolvedValueOnce(mockExisting as any)
        .mockResolvedValueOnce(mockUpdated as any);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        `UPDATE evaluation_form
       SET score = $1, feedback_summary = $2
       WHERE id = $3
       RETURNING id, study_id, teacher_id, submitted_at, score, feedback_summary`,
        [8, 'Buen trabajo actualizado', '1']
      );
    });

    test('20. Debe manejar feedback_summary muy largo', async () => {
      const longFeedback = 'A'.repeat(1000);
      mockReq.body = { score: 9, feedback_summary: longFeedback };

      const mockExisting = { rows: [{ id: 1, teacher_id: 1 }] };
      const mockUpdated = { rows: [{ id: 1, feedback_summary: longFeedback }] };

      mockPool.query
        .mockResolvedValueOnce(mockExisting as any)
        .mockResolvedValueOnce(mockUpdated as any);

      await updateEvaluation(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE evaluation_form'),
        [9, longFeedback, '1']
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
}); 