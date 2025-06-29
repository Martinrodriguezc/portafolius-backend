import { Request, Response } from 'express';
import { getAllStudiesWithEvaluationStatus } from '../../../src/controllers/studyController/getAllStudies';

// Mock de la base de datos
jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Mock del logger
jest.mock('../../../src/config/logger');

const { pool } = require('../../../src/config/db');

describe('getAllStudiesWithEvaluationStatus', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Casos exitosos', () => {
    test('debe obtener todos los estudios con información de evaluación exitosamente', async () => {
      const mockStudies = [
        {
          study_id: 1,
          title: 'Estudio 1',
          description: 'Descripción del estudio 1',
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan.perez@example.com',
          has_evaluation: true,
          score: 8
        },
        {
          study_id: 2,
          title: 'Estudio 2',
          description: 'Descripción del estudio 2',
          status: 'completado',
          created_at: new Date('2024-01-14T09:00:00Z'),
          first_name: 'María',
          last_name: 'González',
          email: 'maria.gonzalez@example.com',
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('debe retornar array vacío cuando no hay estudios', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: []
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('debe incluir estudios con evaluaciones múltiples', async () => {
      const mockStudies = [
        {
          study_id: 1,
          title: 'Estudio con múltiples evaluaciones',
          description: 'Descripción del estudio',
          status: 'evaluado',
          created_at: new Date('2024-01-15T10:00:00Z'),
          first_name: 'Ana',
          last_name: 'López',
          email: 'ana.lopez@example.com',
          has_evaluation: true,
          score: 9 // Score más reciente
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
      expect(mockStudies[0].score).toBe(9);
    });

    test('debe manejar estudios sin estudiante asociado', async () => {
      const mockStudies = [
        {
          study_id: 1,
          title: 'Estudio huérfano',
          description: 'Estudio sin estudiante',
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          first_name: null,
          last_name: null,
          email: null,
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
    });
  });

  describe('Validación de query SQL', () => {
    test('debe ejecutar la query SQL correcta con todos los campos necesarios', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(`
      SELECT 
        s.id AS study_id,
        s.title,
        s.description,
        s.status,
        s.created_at,
        u.first_name,
        u.last_name,
        u.email,
        EXISTS (
          SELECT 1 FROM evaluation_form ef WHERE ef.study_id = s.id
        ) AS has_evaluation,
        (
          SELECT ef.score 
          FROM evaluation_form ef 
          WHERE ef.study_id = s.id 
          ORDER BY ef.submitted_at DESC 
          LIMIT 1
        ) AS score
      FROM study s
      JOIN users u ON u.id = s.student_id
      ORDER BY s.created_at DESC;
    `);
    });

    test('debe usar JOIN para obtener información del estudiante', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('JOIN users u ON u.id = s.student_id');
    });

    test('debe usar EXISTS para verificar evaluaciones', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('EXISTS (');
      expect(calledQuery).toContain('SELECT 1 FROM evaluation_form ef WHERE ef.study_id = s.id');
    });

    test('debe usar subconsulta para obtener el score más reciente', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('ORDER BY ef.submitted_at DESC');
      expect(calledQuery).toContain('LIMIT 1');
    });

    test('debe ordenar por fecha de creación descendente', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('ORDER BY s.created_at DESC');
    });
  });

  describe('Manejo de errores', () => {
    test('debe manejar errores de base de datos', async () => {
      const dbError = new Error('Database connection error');
      pool.query.mockRejectedValue(dbError);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener todos los estudios:', dbError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener estudios'
      });
    });

    test('debe manejar errores de conexión timeout', async () => {
      const timeoutError = new Error('Connection timeout');
      pool.query.mockRejectedValue(timeoutError);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener todos los estudios:', timeoutError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener estudios'
      });
    });

    test('debe manejar errores SQL específicos', async () => {
      const sqlError = new Error('syntax error at or near "SELECT"');
      pool.query.mockRejectedValue(sqlError);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener todos los estudios:', sqlError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener estudios'
      });
    });

    test('debe manejar errores de foreign key', async () => {
      const fkError = new Error('relation "users" does not exist');
      pool.query.mockRejectedValue(fkError);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener todos los estudios:', fkError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener estudios'
      });
    });
  });

  describe('Casos edge', () => {
    test('debe manejar estudios con títulos muy largos', async () => {
      const longTitle = 'A'.repeat(1000);
      const mockStudies = [
        {
          study_id: 1,
          title: longTitle,
          description: 'Descripción normal',
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan.perez@example.com',
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
      expect(mockStudies[0].title.length).toBe(1000);
    });

    test('debe manejar estudios con caracteres especiales', async () => {
      const specialTitle = "Estudio con 'comillas' y \"comillas dobles\" & símbolos!";
      const specialDescription = "Descripción con chars especiales: @#$%^&*()_+{}|:<>?";
      
      const mockStudies = [
        {
          study_id: 1,
          title: specialTitle,
          description: specialDescription,
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          first_name: 'María José',
          last_name: 'García-López',
          email: 'maria.jose@example.com',
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
    });

    test('debe manejar scores con valores límite', async () => {
      const mockStudies = [
        {
          study_id: 1,
          title: 'Estudio con score 0',
          description: 'Descripción',
          status: 'evaluado',
          created_at: new Date('2024-01-15T10:00:00Z'),
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan.perez@example.com',
          has_evaluation: true,
          score: 0
        },
        {
          study_id: 2,
          title: 'Estudio con score máximo',
          description: 'Descripción',
          status: 'evaluado',
          created_at: new Date('2024-01-14T10:00:00Z'),
          first_name: 'María',
          last_name: 'González',
          email: 'maria.gonzalez@example.com',
          has_evaluation: true,
          score: 10
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
      expect(mockStudies[0].score).toBe(0);
      expect(mockStudies[1].score).toBe(10);
    });

    test('debe manejar fechas en diferentes formatos', async () => {
      const mockStudies = [
        {
          study_id: 1,
          title: 'Estudio con fecha antigua',
          description: 'Descripción',
          status: 'completado',
          created_at: new Date('2020-01-01T00:00:00Z'),
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan.perez@example.com',
          has_evaluation: true,
          score: 7
        },
        {
          study_id: 2,
          title: 'Estudio reciente',
          description: 'Descripción',
          status: 'pendiente',
          created_at: new Date('2024-12-31T23:59:59Z'),
          first_name: 'María',
          last_name: 'González',
          email: 'maria.gonzalez@example.com',
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
    });

    test('debe manejar diferentes estados de estudio', async () => {
      const mockStudies = [
        {
          study_id: 1,
          title: 'Estudio pendiente',
          description: 'Descripción',
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan.perez@example.com',
          has_evaluation: false,
          score: null
        },
        {
          study_id: 2,
          title: 'Estudio en progreso',
          description: 'Descripción',
          status: 'en_progreso',
          created_at: new Date('2024-01-14T10:00:00Z'),
          first_name: 'María',
          last_name: 'González',
          email: 'maria.gonzalez@example.com',
          has_evaluation: false,
          score: null
        },
        {
          study_id: 3,
          title: 'Estudio completado',
          description: 'Descripción',
          status: 'completado',
          created_at: new Date('2024-01-13T10:00:00Z'),
          first_name: 'Ana',
          last_name: 'López',
          email: 'ana.lopez@example.com',
          has_evaluation: true,
          score: 8
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
    });
  });

  describe('Validación de estructura de respuesta', () => {
    test('debe incluir todos los campos necesarios en cada estudio', async () => {
      const mockStudies = [
        {
          study_id: 1,
          title: 'Estudio completo',
          description: 'Descripción del estudio',
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan.perez@example.com',
          has_evaluation: true,
          score: 8
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });

      const study = mockStudies[0];
      expect(study).toHaveProperty('study_id');
      expect(study).toHaveProperty('title');
      expect(study).toHaveProperty('description');
      expect(study).toHaveProperty('status');
      expect(study).toHaveProperty('created_at');
      expect(study).toHaveProperty('first_name');
      expect(study).toHaveProperty('last_name');
      expect(study).toHaveProperty('email');
      expect(study).toHaveProperty('has_evaluation');
      expect(study).toHaveProperty('score');
    });

    test('debe retornar has_evaluation como boolean', async () => {
      const mockStudies = [
        {
          study_id: 1,
          title: 'Estudio con evaluación',
          description: 'Descripción',
          status: 'evaluado',
          created_at: new Date('2024-01-15T10:00:00Z'),
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan.perez@example.com',
          has_evaluation: true,
          score: 8
        },
        {
          study_id: 2,
          title: 'Estudio sin evaluación',
          description: 'Descripción',
          status: 'pendiente',
          created_at: new Date('2024-01-14T10:00:00Z'),
          first_name: 'María',
          last_name: 'González',
          email: 'maria.gonzalez@example.com',
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getAllStudiesWithEvaluationStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });

      expect(typeof mockStudies[0].has_evaluation).toBe('boolean');
      expect(typeof mockStudies[1].has_evaluation).toBe('boolean');
      expect(mockStudies[0].has_evaluation).toBe(true);
      expect(mockStudies[1].has_evaluation).toBe(false);
    });
  });
}); 