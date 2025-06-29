import { Request, Response, NextFunction } from 'express';

// Mock de módulos ANTES de importar
jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock de console.log y console.error
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

import { createEvaluation } from '../../../src/controllers/evaluationController/createEvaluation';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';

// Referencias a los mocks
const mockPool = pool as jest.Mocked<typeof pool>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('CreateEvaluation Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Reset de todos los mocks
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    // Setup del request base
    mockReq = {
      params: {},
      body: {},
      user: {
        id: 1,
        email: 'teacher@example.com',
        role: 'profesor'
      }
    } as any;

    // Setup del response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Setup del next
    mockNext = jest.fn();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Casos exitosos', () => {
    test('1. Debe crear evaluación exitosamente', async () => {
      const studyId = '123';
      const teacherId = 1;
      const evaluationData = {
        score: 8,
        feedback_summary: 'Excelente trabajo con diagnóstico preciso'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      // Mock de respuesta de inserción
      const mockInsertResult = {
        rows: [{
          id: 456,
          study_id: 123,
          teacher_id: teacherId,
          submitted_at: '2024-01-15T10:30:00Z',
          score: 8,
          feedback_summary: 'Excelente trabajo con diagnóstico preciso'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      // Verificar inserción
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO evaluation_form'),
        [studyId, teacherId, 8, 'Excelente trabajo con diagnóstico preciso']
      );

      // Verificar respuesta
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockInsertResult.rows[0]);

      // Verificar logging
      expect(mockLogger.info).toHaveBeenCalledWith('Nueva evaluación creada: 456');
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('2. Debe manejar score mínimo válido (1)', async () => {
      const studyId = '789';
      const evaluationData = {
        score: 1,
        feedback_summary: 'Necesita mejorar significativamente'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      const mockInsertResult = {
        rows: [{
          id: 111,
          study_id: 789,
          teacher_id: 1,
          submitted_at: '2024-01-15T11:00:00Z',
          score: 1,
          feedback_summary: 'Necesita mejorar significativamente'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [studyId, 1, 1, 'Necesita mejorar significativamente']
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockInsertResult.rows[0]);
    });

    test('3. Debe manejar score máximo válido (10)', async () => {
      const studyId = '999';
      const evaluationData = {
        score: 10,
        feedback_summary: 'Excelente, diagnóstico perfecto'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      const mockInsertResult = {
        rows: [{
          id: 222,
          study_id: 999,
          teacher_id: 1,
          submitted_at: '2024-01-15T12:00:00Z',
          score: 10,
          feedback_summary: 'Excelente, diagnóstico perfecto'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [studyId, 1, 10, 'Excelente, diagnóstico perfecto']
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    test('4. Debe manejar feedback_summary largo', async () => {
      const studyId = '555';
      const longFeedback = 'Este es un feedback muy detallado que explica todos los aspectos de la evaluación incluyendo fortalezas y áreas de mejora del estudiante';
      const evaluationData = {
        score: 7,
        feedback_summary: longFeedback
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      const mockInsertResult = {
        rows: [{
          id: 333,
          study_id: 555,
          teacher_id: 1,
          submitted_at: '2024-01-15T13:00:00Z',
          score: 7,
          feedback_summary: longFeedback
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [studyId, 1, 7, longFeedback]
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Casos de error - Validación de score', () => {
    test('5. Debe retornar error 400 para score no numérico', async () => {
      const studyId = '123';
      const evaluationData = {
        score: 'invalid',
        feedback_summary: 'Test feedback'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Score debe ser número entre 1 y 10'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('6. Debe retornar error 400 para score menor a 1', async () => {
      const studyId = '123';
      const evaluationData = {
        score: 0,
        feedback_summary: 'Test feedback'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Score debe ser número entre 1 y 10'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('7. Debe retornar error 400 para score mayor a 10', async () => {
      const studyId = '123';
      const evaluationData = {
        score: 11,
        feedback_summary: 'Test feedback'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Score debe ser número entre 1 y 10'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('8. Debe retornar error 400 para score decimal fuera de rango', async () => {
      const studyId = '123';
      const evaluationData = {
        score: 0.5,
        feedback_summary: 'Test feedback'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Score debe ser número entre 1 y 10'
      });
    });

    test('9. Debe retornar error 400 para score null', async () => {
      const studyId = '123';
      const evaluationData = {
        score: null,
        feedback_summary: 'Test feedback'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Score debe ser número entre 1 y 10'
      });
    });

    test('10. Debe retornar error 400 para score undefined', async () => {
      const studyId = '123';
      const evaluationData = {
        feedback_summary: 'Test feedback'
        // score undefined
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Score debe ser número entre 1 y 10'
      });
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('11. Debe manejar errores de inserción en DB', async () => {
      const studyId = '123';
      const evaluationData = {
        score: 8,
        feedback_summary: 'Test feedback'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(dbError);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al crear evaluación',
        { error: dbError }
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al crear evaluación'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('12. Debe manejar errores de constraint violation', async () => {
      const studyId = '999';
      const evaluationData = {
        score: 5,
        feedback_summary: 'Test feedback'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      const constraintError = new Error('Foreign key constraint violation');
      mockPool.query.mockRejectedValue(constraintError);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al crear evaluación',
        { error: constraintError }
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('13. Debe manejar timeout de conexión a DB', async () => {
      const studyId = '777';
      const evaluationData = {
        score: 9,
        feedback_summary: 'Test feedback'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      const timeoutError = new Error('Connection timeout');
      mockPool.query.mockRejectedValue(timeoutError);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al crear evaluación',
        { error: timeoutError }
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al crear evaluación'
      });
    });
  });

  describe('Validación de SQL query', () => {
    test('14. Debe usar la query SQL correcta', async () => {
      const studyId = '456';
      const evaluationData = {
        score: 6,
        feedback_summary: 'SQL test feedback'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      const mockInsertResult = {
        rows: [{
          id: 789,
          study_id: 456,
          teacher_id: 1,
          submitted_at: '2024-01-15T14:00:00Z',
          score: 6,
          feedback_summary: 'SQL test feedback'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('INSERT INTO evaluation_form');
      expect(actualQuery).toContain('study_id, teacher_id, score, feedback_summary');
      expect(actualQuery).toContain('VALUES ($1, $2, $3, $4)');
      expect(actualQuery).toContain('RETURNING id, study_id, teacher_id, submitted_at, score, feedback_summary');
    });

    test('15. Debe usar parámetros correctos en la query', async () => {
      const studyId = '888';
      const teacherId = 5;
      const evaluationData = {
        score: 7,
        feedback_summary: 'Parameter test'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;
      (mockReq as any).user = { id: teacherId };

      const mockInsertResult = {
        rows: [{ id: 999 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [studyId, teacherId, 7, 'Parameter test']
      );
    });
  });

  describe('Estructura de respuesta', () => {
    test('16. Debe retornar estructura correcta para evaluación exitosa', async () => {
      const studyId = '111';
      const evaluationData = {
        score: 8,
        feedback_summary: 'Response test'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      const mockEvaluationResponse = {
        id: 666,
        study_id: 111,
        teacher_id: 1,
        submitted_at: '2024-01-15T15:00:00Z',
        score: 8,
        feedback_summary: 'Response test'
      };

      const mockInsertResult = {
        rows: [mockEvaluationResponse],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(Number),
          study_id: expect.any(Number),
          teacher_id: expect.any(Number),
          submitted_at: expect.any(String),
          score: expect.any(Number),
          feedback_summary: expect.any(String),
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockEvaluationResponse);
    });

    test('17. Debe retornar estructura correcta para error 400', async () => {
      const studyId = '123';
      const evaluationData = {
        score: 'invalid',
        feedback_summary: 'Error test'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.any(String),
        })
      );
    });

    test('18. Debe retornar estructura correcta para error 500', async () => {
      const studyId = '123';
      const evaluationData = {
        score: 8,
        feedback_summary: 'DB error test'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      const dbError = new Error('DB error');
      mockPool.query.mockRejectedValue(dbError);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.any(String),
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al crear evaluación'
      });
    });
  });

  describe('Logging y auditoría', () => {
    test('19. Debe registrar logs exitosos correctamente', async () => {
      const studyId = '999';
      const evaluationData = {
        score: 9,
        feedback_summary: 'Logging test'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      const mockInsertResult = {
        rows: [{
          id: 777,
          study_id: 999,
          teacher_id: 1,
          submitted_at: '2024-01-15T16:00:00Z',
          score: 9,
          feedback_summary: 'Logging test'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith('Nueva evaluación creada: 777');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('20. Debe registrar logs de error correctamente', async () => {
      const studyId = '555';
      const evaluationData = {
        score: 4,
        feedback_summary: 'Error logging test'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      const specificError = new Error('Specific database error');
      mockPool.query.mockRejectedValue(specificError);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al crear evaluación',
        { error: specificError }
      );
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Flujo de ejecución', () => {
    test('21. Debe validar score antes de ejecutar query', async () => {
      const studyId = '123';
      const evaluationData = {
        score: -1,
        feedback_summary: 'Validation test'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      // No debe ejecutar query si score es inválido
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('22. Debe extraer teacherId del token correctamente', async () => {
      const studyId = '789';
      const customTeacherId = 99;
      const evaluationData = {
        score: 6,
        feedback_summary: 'Teacher ID test'
      };

      mockReq.params = { studyId };
      mockReq.body = evaluationData;
      (mockReq as any).user = { id: customTeacherId };

      const mockInsertResult = {
        rows: [{ id: 123, teacher_id: customTeacherId }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createEvaluation(mockReq as Request, mockRes as Response, mockNext);

      // Verificar que usa el teacherId del token
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [studyId, customTeacherId, 6, 'Teacher ID test']
      );
    });
  });
}); 

// Tests adicionales para saveDiagnosis y getDiagnosedVideos
describe('SaveDiagnosis Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  const mockPool = pool as jest.Mocked<typeof pool>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    mockReq = {
      params: { videoId: '123' },
      body: { diagnosis: 'Test diagnosis' },
      user: { id: 1 }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn(() => mockRes as Response)
    };

    jest.clearAllMocks();
  });

  test('1. Debe guardar diagnóstico exitosamente', async () => {
    const { saveDiagnosis } = require('../../../src/controllers/evaluationController/createEvaluation');
    
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

    await saveDiagnosis(mockReq as Request, mockRes as Response);

    expect(mockPool.query).toHaveBeenCalledWith(
      'INSERT INTO video_diagnosis (video_id, student_id, diagnosis)\n       VALUES ($1, $2, $3)',
      ['123', 1, 'Test diagnosis']
    );
    expect(mockLogger.info).toHaveBeenCalledWith('Diagnóstico guardado para video 123 por estudiante 1');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Diagnóstico guardado exitosamente'
    });
  });

  test('2. Debe manejar errores de base de datos en saveDiagnosis', async () => {
    const { saveDiagnosis } = require('../../../src/controllers/evaluationController/createEvaluation');
    
    const dbError = new Error('Database error');
    mockPool.query.mockRejectedValueOnce(dbError);

    await saveDiagnosis(mockReq as Request, mockRes as Response);

    expect(mockLogger.error).toHaveBeenCalledWith('Error al guardar diagnóstico', { error: dbError });
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Error interno al guardar diagnóstico'
    });
  });

  test('3. Debe usar studentId del token de usuario', async () => {
    const { saveDiagnosis } = require('../../../src/controllers/evaluationController/createEvaluation');
    
    mockReq.user = { id: 999 };
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

    await saveDiagnosis(mockReq as Request, mockRes as Response);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      ['123', 999, 'Test diagnosis']
    );
  });

  test('4. Debe manejar videoId diferentes', async () => {
    const { saveDiagnosis } = require('../../../src/controllers/evaluationController/createEvaluation');
    
    mockReq.params = { videoId: '456' };
    mockReq.body = { diagnosis: 'Another diagnosis' };
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

    await saveDiagnosis(mockReq as Request, mockRes as Response);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      ['456', 1, 'Another diagnosis']
    );
  });
});

describe('GetDiagnosedVideos Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
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

    jest.clearAllMocks();
  });

  test('1. Debe retornar videos diagnosticados exitosamente', async () => {
    const { getDiagnosedVideos } = require('../../../src/controllers/evaluationController/createEvaluation');
    
    const mockResult = {
      rows: [
        { video_id: 123 },
        { video_id: 456 },
        { video_id: 789 }
      ]
    };
    mockPool.query.mockResolvedValueOnce(mockResult as any);

    await getDiagnosedVideos(mockReq as Request, mockRes as Response);

    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT video_id FROM video_diagnosis WHERE student_id = $1',
      [1]
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      diagnosedVideoIds: [123, 456, 789]
    });
  });

  test('2. Debe retornar array vacío cuando no hay diagnósticos', async () => {
    const { getDiagnosedVideos } = require('../../../src/controllers/evaluationController/createEvaluation');
    
    const mockResult = { rows: [] };
    mockPool.query.mockResolvedValueOnce(mockResult as any);

    await getDiagnosedVideos(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      diagnosedVideoIds: []
    });
  });

  test('3. Debe usar studentId del token de usuario', async () => {
    const { getDiagnosedVideos } = require('../../../src/controllers/evaluationController/createEvaluation');
    
    mockReq.user = { id: 999 };
    const mockResult = { rows: [{ video_id: 111 }] };
    mockPool.query.mockResolvedValueOnce(mockResult as any);

    await getDiagnosedVideos(mockReq as Request, mockRes as Response);

    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT video_id FROM video_diagnosis WHERE student_id = $1',
      [999]
    );
  });

  test('4. Debe manejar errores de base de datos', async () => {
    const { getDiagnosedVideos } = require('../../../src/controllers/evaluationController/createEvaluation');
    
    const dbError = new Error('Database connection failed');
    mockPool.query.mockRejectedValueOnce(dbError);

    await getDiagnosedVideos(mockReq as Request, mockRes as Response);

    expect(mockLogger.error).toHaveBeenCalledWith('Error al obtener diagnósticos', { error: dbError });
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Error interno al obtener diagnósticos'
    });
  });

  test('5. Debe transformar correctamente la respuesta', async () => {
    const { getDiagnosedVideos } = require('../../../src/controllers/evaluationController/createEvaluation');
    
    const mockResult = {
      rows: [
        { video_id: 1 },
        { video_id: 2 },
        { video_id: 3 },
        { video_id: 4 }
      ]
    };
    mockPool.query.mockResolvedValueOnce(mockResult as any);

    await getDiagnosedVideos(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith({
      diagnosedVideoIds: [1, 2, 3, 4]
    });
  });
}); 