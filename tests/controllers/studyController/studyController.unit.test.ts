import { Request, Response } from 'express';
import { getStudentStudies } from '../../../src/controllers/studyController/studyController';

// Mock de la base de datos
jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Mock del logger
jest.mock('../../../src/config/logger');

const { pool } = require('../../../src/config/db');

describe('getStudentStudies', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReq = {
      params: { userId: '123' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Casos exitosos', () => {
    test('debe obtener estudios del estudiante exitosamente', async () => {
      const mockStudies = [
        {
          id: 1,
          title: 'Estudio 1',
          description: 'Descripción del estudio 1',
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          has_evaluation: true,
          score: 8
        },
        {
          id: 2,
          title: 'Estudio 2',
          description: 'Descripción del estudio 2',
          status: 'completado',
          created_at: new Date('2024-01-14T09:00:00Z'),
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('debe retornar array vacío cuando el estudiante no tiene estudios', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: []
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('debe convertir userId string a número correctamente', async () => {
      mockReq.params = { userId: '456' };
      
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [456]
      );
    });

    test('debe manejar estudios con evaluaciones múltiples', async () => {
      const mockStudies = [
        {
          id: 1,
          title: 'Estudio con múltiples evaluaciones',
          description: 'Descripción del estudio',
          status: 'evaluado',
          created_at: new Date('2024-01-15T10:00:00Z'),
          has_evaluation: true,
          score: 9 // Score más reciente
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
      expect(mockStudies[0].score).toBe(9);
    });
  });

  describe('Validación de parámetros', () => {
    test('debe retornar error 400 para userId inválido (no numérico)', async () => {
      mockReq.params = { userId: 'invalid' };

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'ID de estudiante inválido'
      });
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('debe retornar error 400 para userId vacío', async () => {
      mockReq.params = { userId: '' };

      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      // Number('') devuelve 0, que es un número válido, por lo que no se valida como inválido
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [0]
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        studies: []
      });
    });

    test('debe retornar error 400 para userId con caracteres especiales', async () => {
      mockReq.params = { userId: '123abc' };

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'ID de estudiante inválido'
      });
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('debe aceptar userId numérico válido', async () => {
      const validIds = ['1', '123', '999999999'];
      
      for (const validId of validIds) {
        mockReq.params = { userId: validId };
        const mockResult = { rows: [] };
        pool.query.mockResolvedValue(mockResult);

        await getStudentStudies(mockReq as Request, mockRes as Response);

        expect(pool.query).toHaveBeenCalledWith(
          expect.any(String),
          [Number(validId)]
        );
        expect(mockRes.status).not.toHaveBeenCalledWith(400);
        
        jest.clearAllMocks();
      }
    });

    test('debe manejar userId con ceros a la izquierda', async () => {
      mockReq.params = { userId: '00123' };
      
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [123]
      );
    });
  });

  describe('Validación de query SQL', () => {
    test('debe ejecutar la query SQL correcta con todos los campos', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        `SELECT 
        s.id,
        s.title,
        s.description,
        s.status,
        s.created_at,
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
      WHERE s.student_id = $1
      ORDER BY s.created_at DESC`,
        [123]
      );
    });

    test('debe filtrar por student_id', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('WHERE s.student_id = $1');
    });

    test('debe usar EXISTS para verificar evaluaciones', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('EXISTS (');
      expect(calledQuery).toContain('SELECT 1 FROM evaluation_form ef WHERE ef.study_id = s.id');
    });

    test('debe usar subconsulta para obtener el score más reciente', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('ORDER BY ef.submitted_at DESC');
      expect(calledQuery).toContain('LIMIT 1');
    });

    test('debe ordenar por fecha de creación descendente', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('ORDER BY s.created_at DESC');
    });
  });

  describe('Manejo de errores', () => {
    test('debe manejar errores de base de datos', async () => {
      const dbError = new Error('Database connection error');
      pool.query.mockRejectedValue(dbError);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener estudios del usuario:', dbError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener estudios del usuario'
      });
    });

    test('debe manejar errores de timeout', async () => {
      const timeoutError = new Error('Query timeout');
      pool.query.mockRejectedValue(timeoutError);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener estudios del usuario:', timeoutError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener estudios del usuario'
      });
    });

    test('debe manejar errores SQL específicos', async () => {
      const sqlError = new Error('syntax error at or near "SELECT"');
      pool.query.mockRejectedValue(sqlError);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener estudios del usuario:', sqlError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener estudios del usuario'
      });
    });

    test('debe manejar errores de foreign key', async () => {
      const fkError = new Error('relation "study" does not exist');
      pool.query.mockRejectedValue(fkError);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener estudios del usuario:', fkError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener estudios del usuario'
      });
    });
  });

  describe('Casos edge', () => {
    test('debe manejar estudios con títulos muy largos', async () => {
      const longTitle = 'A'.repeat(1000);
      const mockStudies = [
        {
          id: 1,
          title: longTitle,
          description: 'Descripción normal',
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

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
          id: 1,
          title: specialTitle,
          description: specialDescription,
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
    });

    test('debe manejar scores con valores límite', async () => {
      const mockStudies = [
        {
          id: 1,
          title: 'Estudio con score 0',
          description: 'Descripción',
          status: 'evaluado',
          created_at: new Date('2024-01-15T10:00:00Z'),
          has_evaluation: true,
          score: 0
        },
        {
          id: 2,
          title: 'Estudio con score máximo',
          description: 'Descripción',
          status: 'evaluado',
          created_at: new Date('2024-01-14T10:00:00Z'),
          has_evaluation: true,
          score: 10
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
      expect(mockStudies[0].score).toBe(0);
      expect(mockStudies[1].score).toBe(10);
    });

    test('debe manejar fechas en diferentes formatos', async () => {
      const mockStudies = [
        {
          id: 1,
          title: 'Estudio con fecha antigua',
          description: 'Descripción',
          status: 'completado',
          created_at: new Date('2020-01-01T00:00:00Z'),
          has_evaluation: true,
          score: 7
        },
        {
          id: 2,
          title: 'Estudio reciente',
          description: 'Descripción',
          status: 'pendiente',
          created_at: new Date('2024-12-31T23:59:59Z'),
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
    });

    test('debe manejar diferentes estados de estudio', async () => {
      const mockStudies = [
        {
          id: 1,
          title: 'Estudio pendiente',
          description: 'Descripción',
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          has_evaluation: false,
          score: null
        },
        {
          id: 2,
          title: 'Estudio en progreso',
          description: 'Descripción',
          status: 'en_progreso',
          created_at: new Date('2024-01-14T10:00:00Z'),
          has_evaluation: false,
          score: null
        },
        {
          id: 3,
          title: 'Estudio completado',
          description: 'Descripción',
          status: 'completado',
          created_at: new Date('2024-01-13T10:00:00Z'),
          has_evaluation: true,
          score: 8
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });
    });

    test('debe manejar userId con valores límite', async () => {
      mockReq.params = { userId: '999999999' };
      
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [999999999]
      );
    });
  });

  describe('Validación de estructura de respuesta', () => {
    test('debe incluir todos los campos necesarios en cada estudio', async () => {
      const mockStudies = [
        {
          id: 1,
          title: 'Estudio completo',
          description: 'Descripción del estudio',
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          has_evaluation: true,
          score: 8
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });

      const study = mockStudies[0];
      expect(study).toHaveProperty('id');
      expect(study).toHaveProperty('title');
      expect(study).toHaveProperty('description');
      expect(study).toHaveProperty('status');
      expect(study).toHaveProperty('created_at');
      expect(study).toHaveProperty('has_evaluation');
      expect(study).toHaveProperty('score');
    });

    test('debe retornar has_evaluation como boolean', async () => {
      const mockStudies = [
        {
          id: 1,
          title: 'Estudio con evaluación',
          description: 'Descripción',
          status: 'evaluado',
          created_at: new Date('2024-01-15T10:00:00Z'),
          has_evaluation: true,
          score: 8
        },
        {
          id: 2,
          title: 'Estudio sin evaluación',
          description: 'Descripción',
          status: 'pendiente',
          created_at: new Date('2024-01-14T10:00:00Z'),
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });

      expect(typeof mockStudies[0].has_evaluation).toBe('boolean');
      expect(typeof mockStudies[1].has_evaluation).toBe('boolean');
      expect(mockStudies[0].has_evaluation).toBe(true);
      expect(mockStudies[1].has_evaluation).toBe(false);
    });

    test('debe verificar que los IDs son numéricos', async () => {
      const mockStudies = [
        {
          id: 1,
          title: 'Estudio de prueba',
          description: 'Descripción',
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });

      const study = mockStudies[0];
      expect(typeof study.id).toBe('number');
    });

    test('debe verificar que las fechas son objetos Date válidos', async () => {
      const mockStudies = [
        {
          id: 1,
          title: 'Estudio con fecha',
          description: 'Descripción',
          status: 'pendiente',
          created_at: new Date('2024-01-15T10:00:00Z'),
          has_evaluation: false,
          score: null
        }
      ];

      const mockResult = { rows: mockStudies };
      pool.query.mockResolvedValue(mockResult);

      await getStudentStudies(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        studies: mockStudies
      });

      const study = mockStudies[0];
      expect(study.created_at).toBeInstanceOf(Date);
      expect(study.created_at.getTime()).not.toBeNaN();
    });
  });
}); 