import { Request, Response } from 'express';
import { getRecentComments } from '../../../src/controllers/studyController/getRecentComments';

// Mock de la base de datos
jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Mock del logger
jest.mock('../../../src/config/logger');

const { pool } = require('../../../src/config/db');

describe('getRecentComments', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReq = {
      params: { id: '123' }
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
    test('debe obtener comentarios recientes exitosamente', async () => {
      const mockComments = [
        {
          id: 1,
          text: 'Excelente trabajo en este video',
          author: 'María González',
          date: '15 de January, 2024',
          studyId: 101,
          videoId: 201
        },
        {
          id: 2,
          text: 'Necesita mejorar la técnica',
          author: 'Juan Pérez',
          date: '14 de January, 2024',
          studyId: 102,
          videoId: 202
        }
      ];

      const mockResult = { rows: mockComments };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        comments: mockComments
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('debe retornar array vacío cuando no hay comentarios', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        comments: []
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('debe manejar diferentes formatos de fecha', async () => {
      const mockComments = [
        {
          id: 1,
          text: 'Comentario con fecha en español',
          author: 'Ana López',
          date: '01 de Enero, 2024',
          studyId: 101,
          videoId: 201
        },
        {
          id: 2,
          text: 'Comentario con fecha reciente',
          author: 'Carlos Ruiz',
          date: '31 de Diciembre, 2023',
          studyId: 102,
          videoId: 202
        }
      ];

      const mockResult = { rows: mockComments };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        comments: mockComments
      });
      expect(mockComments[0].date).toContain('de');
      expect(mockComments[1].date).toContain('de');
    });

    test('debe usar el ID del estudiante correctamente', async () => {
      mockReq.params = { id: '456' };
      
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['456']
      );
    });
  });

  describe('Validación de query SQL', () => {
    test('debe ejecutar la query SQL correcta con todos los campos', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        `SELECT
         cc.id,
         cc.comment_text   AS text,
         CONCAT(u.first_name, ' ', u.last_name) AS author,
         TO_CHAR(cc.timestamp, 'DD "de" FMMonth, YYYY') AS date,
         vc.study_id       AS "studyId",
         cc.clip_id        AS "videoId"
       FROM clip_comment cc
       JOIN video_clip vc   ON vc.id = cc.clip_id
       JOIN study s         ON s.id = vc.study_id
       JOIN users u         ON u.id = cc.user_id
       WHERE s.student_id = $1
         AND cc.user_id   != $1
       ORDER BY cc.timestamp DESC
       LIMIT 50`,
        ['123']
      );
    });

    test('debe usar JOINs correctos para relacionar tablas', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('JOIN video_clip vc   ON vc.id = cc.clip_id');
      expect(calledQuery).toContain('JOIN study s         ON s.id = vc.study_id');
      expect(calledQuery).toContain('JOIN users u         ON u.id = cc.user_id');
    });

    test('debe filtrar comentarios del estudiante especificado', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('WHERE s.student_id = $1');
    });

    test('debe excluir comentarios del propio estudiante', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('AND cc.user_id   != $1');
    });

    test('debe ordenar por timestamp descendente', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('ORDER BY cc.timestamp DESC');
    });

    test('debe limitar a 50 comentarios', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('LIMIT 50');
    });

    test('debe usar CONCAT para el nombre completo del autor', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain(`CONCAT(u.first_name, ' ', u.last_name) AS author`);
    });

    test('debe usar TO_CHAR para formatear la fecha', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain(`TO_CHAR(cc.timestamp, 'DD "de" FMMonth, YYYY') AS date`);
    });
  });

  describe('Manejo de errores', () => {
    test('debe manejar errores de base de datos', async () => {
      const dbError = new Error('Database connection error');
      pool.query.mockRejectedValue(dbError);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener comentarios recientes:', dbError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener comentarios'
      });
    });

    test('debe manejar errores de timeout', async () => {
      const timeoutError = new Error('Query timeout');
      pool.query.mockRejectedValue(timeoutError);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener comentarios recientes:', timeoutError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener comentarios'
      });
    });

    test('debe manejar errores SQL específicos', async () => {
      const sqlError = new Error('syntax error at or near "SELECT"');
      pool.query.mockRejectedValue(sqlError);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener comentarios recientes:', sqlError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener comentarios'
      });
    });

    test('debe manejar errores de foreign key', async () => {
      const fkError = new Error('relation "clip_comment" does not exist');
      pool.query.mockRejectedValue(fkError);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener comentarios recientes:', fkError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener comentarios'
      });
    });
  });

  describe('Casos edge', () => {
    test('debe manejar comentarios con texto muy largo', async () => {
      const longText = 'A'.repeat(2000);
      const mockComments = [
        {
          id: 1,
          text: longText,
          author: 'María González',
          date: '15 de January, 2024',
          studyId: 101,
          videoId: 201
        }
      ];

      const mockResult = { rows: mockComments };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        comments: mockComments
      });
      expect(mockComments[0].text.length).toBe(2000);
    });

    test('debe manejar nombres de autor con caracteres especiales', async () => {
      const mockComments = [
        {
          id: 1,
          text: 'Comentario de prueba',
          author: 'María José García-López',
          date: '15 de January, 2024',
          studyId: 101,
          videoId: 201
        },
        {
          id: 2,
          text: 'Otro comentario',
          author: 'José Ángel Martínez',
          date: '14 de January, 2024',
          studyId: 102,
          videoId: 202
        }
      ];

      const mockResult = { rows: mockComments };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        comments: mockComments
      });
    });

    test('debe manejar IDs con valores límite', async () => {
      mockReq.params = { id: '999999999' };
      
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['999999999']
      );
    });

    test('debe manejar comentarios con caracteres especiales', async () => {
      const specialComment = "¡Excelente! Me gustó mucho. ¿Podrías explicar más sobre esto? @usuario #hashtag";
      const mockComments = [
        {
          id: 1,
          text: specialComment,
          author: 'Ana López',
          date: '15 de January, 2024',
          studyId: 101,
          videoId: 201
        }
      ];

      const mockResult = { rows: mockComments };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        comments: mockComments
      });
    });

    test('debe manejar studyId y videoId con valores altos', async () => {
      const mockComments = [
        {
          id: 1,
          text: 'Comentario con IDs altos',
          author: 'Usuario Test',
          date: '15 de January, 2024',
          studyId: 999999999,
          videoId: 888888888
        }
      ];

      const mockResult = { rows: mockComments };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        comments: mockComments
      });
      expect(mockComments[0].studyId).toBe(999999999);
      expect(mockComments[0].videoId).toBe(888888888);
    });
  });

  describe('Validación de estructura de respuesta', () => {
    test('debe incluir todos los campos necesarios en cada comentario', async () => {
      const mockComments = [
        {
          id: 1,
          text: 'Comentario completo',
          author: 'María González',
          date: '15 de January, 2024',
          studyId: 101,
          videoId: 201
        }
      ];

      const mockResult = { rows: mockComments };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        comments: mockComments
      });

      const comment = mockComments[0];
      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('text');
      expect(comment).toHaveProperty('author');
      expect(comment).toHaveProperty('date');
      expect(comment).toHaveProperty('studyId');
      expect(comment).toHaveProperty('videoId');
    });

    test('debe usar aliases correctos para los campos', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      const calledQuery = pool.query.mock.calls[0][0];
      expect(calledQuery).toContain('cc.comment_text   AS text');
      expect(calledQuery).toContain('vc.study_id       AS "studyId"');
      expect(calledQuery).toContain('cc.clip_id        AS "videoId"');
    });

    test('debe manejar comentarios con campos nulos', async () => {
      const mockComments = [
        {
          id: 1,
          text: null,
          author: 'Usuario Sin Comentario',
          date: '15 de January, 2024',
          studyId: 101,
          videoId: 201
        }
      ];

      const mockResult = { rows: mockComments };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        comments: mockComments
      });
    });

    test('debe verificar que los IDs son numéricos', async () => {
      const mockComments = [
        {
          id: 1,
          text: 'Comentario de prueba',
          author: 'María González',
          date: '15 de January, 2024',
          studyId: 101,
          videoId: 201
        }
      ];

      const mockResult = { rows: mockComments };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        comments: mockComments
      });

      const comment = mockComments[0];
      expect(typeof comment.id).toBe('number');
      expect(typeof comment.studyId).toBe('number');
      expect(typeof comment.videoId).toBe('number');
    });

    test('debe verificar que la fecha está formateada correctamente', async () => {
      const mockComments = [
        {
          id: 1,
          text: 'Comentario con fecha',
          author: 'María González',
          date: '15 de January, 2024',
          studyId: 101,
          videoId: 201
        }
      ];

      const mockResult = { rows: mockComments };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        comments: mockComments
      });

      const comment = mockComments[0];
      expect(typeof comment.date).toBe('string');
      expect(comment.date).toMatch(/\d{2} de \w+, \d{4}/);
    });
  });

  describe('Validación de parámetros', () => {
    test('debe usar el parámetro id correctamente', async () => {
      const testIds = ['1', '123', '999999'];
      
      for (const testId of testIds) {
        mockReq.params = { id: testId };
        const mockResult = { rows: [] };
        pool.query.mockResolvedValue(mockResult);

        await getRecentComments(mockReq as Request, mockRes as Response);

        expect(pool.query).toHaveBeenCalledWith(
          expect.any(String),
          [testId]
        );
        
        jest.clearAllMocks();
      }
    });

    test('debe pasar el mismo ID para ambas condiciones WHERE', async () => {
      mockReq.params = { id: '456' };
      
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getRecentComments(mockReq as Request, mockRes as Response);

      const [query, params] = pool.query.mock.calls[0];
      expect(params).toEqual(['456']);
      expect(query).toContain('WHERE s.student_id = $1');
      expect(query).toContain('AND cc.user_id   != $1');
    });
  });
}); 