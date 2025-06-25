import { Request, Response } from 'express';
import { createNewStudy } from '../../../src/controllers/studyController/createNewStudy';

// Mock de la base de datos
jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Mock del logger
jest.mock('../../../src/config/logger');

const { pool } = require('../../../src/config/db');

describe('createNewStudy', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReq = {
      params: { userId: '123' },
      body: {}
    };
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
    test('debe crear un nuevo estudio exitosamente', async () => {
      const studyData = {
        title: 'Test Study',
        description: 'Test Description'
      };
      mockReq.body = studyData;

      const mockStudyResult = {
        rows: [{
          id: 1,
          student_id: 123,
          title: studyData.title,
          description: studyData.description,
          status: 'pendiente',
          created_at: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockStudyResult);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        `INSERT INTO study
         (student_id, title, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, student_id, title, description, status, created_at`,
        ['123', studyData.title, studyData.description, 'pendiente']
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        study: mockStudyResult.rows[0]
      });
    });

    test('debe usar status pendiente por defecto', async () => {
      mockReq.body = {
        title: 'Test Study',
        description: 'Test Description'
      };

      const mockStudyResult = {
        rows: [{
          id: 1,
          student_id: 123,
          title: 'Test Study',
          description: 'Test Description',
          status: 'pendiente',
          created_at: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockStudyResult);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['123', 'Test Study', 'Test Description', 'pendiente']
      );
    });

    test('debe manejar userId como string correctamente', async () => {
      mockReq.params = { userId: '456' };
      mockReq.body = {
        title: 'Another Study',
        description: 'Another Description'
      };

      const mockStudyResult = {
        rows: [{
          id: 2,
          student_id: 456,
          title: 'Another Study',
          description: 'Another Description',
          status: 'pendiente',
          created_at: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockStudyResult);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['456', 'Another Study', 'Another Description', 'pendiente']
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Validación de campos requeridos', () => {
    test('debe retornar error 400 cuando falta title', async () => {
      mockReq.body = {
        description: 'Test Description'
      };

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe proporcionar titulo, descripción y fecha'
      });
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('debe retornar error 400 cuando falta description', async () => {
      mockReq.body = {
        title: 'Test Study'
      };

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe proporcionar titulo, descripción y fecha'
      });
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('debe retornar error 400 cuando faltan ambos campos', async () => {
      mockReq.body = {};

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe proporcionar titulo, descripción y fecha'
      });
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('debe retornar error 400 cuando title es string vacío', async () => {
      mockReq.body = {
        title: '',
        description: 'Test Description'
      };

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe proporcionar titulo, descripción y fecha'
      });
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('debe retornar error 400 cuando description es string vacío', async () => {
      mockReq.body = {
        title: 'Test Study',
        description: ''
      };

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe proporcionar titulo, descripción y fecha'
      });
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('debe retornar error 400 cuando title es null', async () => {
      mockReq.body = {
        title: null,
        description: 'Test Description'
      };

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe proporcionar titulo, descripción y fecha'
      });
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('Manejo de errores', () => {
    test('debe manejar errores de base de datos', async () => {
      mockReq.body = {
        title: 'Test Study',
        description: 'Test Description'
      };

      const dbError = new Error('Database connection error');
      pool.query.mockRejectedValue(dbError);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al crear nuevo estudio:', dbError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al crear el estudio'
      });
    });

    test('debe manejar errores de foreign key constraint', async () => {
      mockReq.body = {
        title: 'Test Study',
        description: 'Test Description'
      };

      const fkError = new Error('insert or update on table "study" violates foreign key constraint');
      pool.query.mockRejectedValue(fkError);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al crear nuevo estudio:', fkError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al crear el estudio'
      });
    });

    test('debe manejar errores de timeout de base de datos', async () => {
      mockReq.body = {
        title: 'Test Study',
        description: 'Test Description'
      };

      const timeoutError = new Error('Query timeout');
      pool.query.mockRejectedValue(timeoutError);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al crear nuevo estudio:', timeoutError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al crear el estudio'
      });
    });

    test('debe manejar errores SQL específicos', async () => {
      mockReq.body = {
        title: 'Test Study',
        description: 'Test Description'
      };

      const sqlError = new Error('syntax error at or near "INSERT"');
      pool.query.mockRejectedValue(sqlError);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al crear nuevo estudio:', sqlError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al crear el estudio'
      });
    });
  });

  describe('Casos edge', () => {
    test('debe manejar títulos muy largos', async () => {
      const longTitle = 'A'.repeat(1000);
      mockReq.body = {
        title: longTitle,
        description: 'Test Description'
      };

      const mockStudyResult = {
        rows: [{
          id: 1,
          student_id: 123,
          title: longTitle,
          description: 'Test Description',
          status: 'pendiente',
          created_at: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockStudyResult);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['123', longTitle, 'Test Description', 'pendiente']
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    test('debe manejar descripciones muy largas', async () => {
      const longDescription = 'B'.repeat(2000);
      mockReq.body = {
        title: 'Test Study',
        description: longDescription
      };

      const mockStudyResult = {
        rows: [{
          id: 1,
          student_id: 123,
          title: 'Test Study',
          description: longDescription,
          status: 'pendiente',
          created_at: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockStudyResult);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['123', 'Test Study', longDescription, 'pendiente']
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    test('debe manejar caracteres especiales en title y description', async () => {
      const specialTitle = "Test's Study with \"quotes\" & symbols!";
      const specialDescription = "Description with special chars: @#$%^&*()_+{}|:<>?";
      
      mockReq.body = {
        title: specialTitle,
        description: specialDescription
      };

      const mockStudyResult = {
        rows: [{
          id: 1,
          student_id: 123,
          title: specialTitle,
          description: specialDescription,
          status: 'pendiente',
          created_at: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockStudyResult);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['123', specialTitle, specialDescription, 'pendiente']
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    test('debe manejar userId con valores límite', async () => {
      mockReq.params = { userId: '999999999' };
      mockReq.body = {
        title: 'Test Study',
        description: 'Test Description'
      };

      const mockStudyResult = {
        rows: [{
          id: 1,
          student_id: 999999999,
          title: 'Test Study',
          description: 'Test Description',
          status: 'pendiente',
          created_at: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockStudyResult);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['999999999', 'Test Study', 'Test Description', 'pendiente']
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Validación de queries SQL', () => {
    test('debe usar la query SQL correcta con todos los campos', async () => {
      mockReq.body = {
        title: 'Test Study',
        description: 'Test Description'
      };

      const mockStudyResult = {
        rows: [{
          id: 1,
          student_id: 123,
          title: 'Test Study',
          description: 'Test Description',
          status: 'pendiente',
          created_at: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockStudyResult);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        `INSERT INTO study
         (student_id, title, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, student_id, title, description, status, created_at`,
        ['123', 'Test Study', 'Test Description', 'pendiente']
      );
    });

    test('debe retornar todos los campos del estudio creado', async () => {
      mockReq.body = {
        title: 'Test Study',
        description: 'Test Description'
      };

      const expectedStudy = {
        id: 1,
        student_id: 123,
        title: 'Test Study',
        description: 'Test Description',
        status: 'pendiente',
        created_at: new Date('2024-01-01T10:00:00Z')
      };

      const mockStudyResult = {
        rows: [expectedStudy]
      };

      pool.query.mockResolvedValue(mockStudyResult);

      await createNewStudy(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        study: expectedStudy
      });
    });
  });
}); 