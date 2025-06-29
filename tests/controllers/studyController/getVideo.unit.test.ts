import { Request, Response } from 'express';
import { getVideosByStudyId } from '../../../src/controllers/studyController/getVideo';

// Mock de la base de datos
jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Mock del logger
jest.mock('../../../src/config/logger');

const { pool } = require('../../../src/config/db');

describe('getVideosByStudyId', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReq = {
      params: { studyId: '123' }
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
    test('debe obtener clips de video exitosamente', async () => {
      const mockClips = [
        {
          id: 1,
          study_id: 123,
          object_key: 'video-1-key',
          original_filename: 'video1.mp4',
          mime_type: 'video/mp4',
          size_bytes: 1048576,
          duration_seconds: 120,
          upload_date: new Date('2024-01-15T10:00:00Z'),
          order_index: 1,
          status: 'processed'
        }
      ];

      const mockResult = { rows: mockClips };
      pool.query.mockResolvedValue(mockResult);

      await getVideosByStudyId(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        clips: mockClips
      });
    });

    test('debe retornar array vacío cuando no hay clips', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getVideosByStudyId(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        clips: []
      });
    });
  });

  describe('Validación de query SQL', () => {
    test('debe ejecutar la query SQL correcta', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      await getVideosByStudyId(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledWith(
        `SELECT id,
              study_id,
              object_key,
              original_filename,
              mime_type,
              size_bytes,
              duration_seconds,
              upload_date,
              order_index,
              status
         FROM video_clip
        WHERE study_id = $1
        ORDER BY order_index`,
        ['123']
      );
    });
  });

  describe('Manejo de errores', () => {
    test('debe manejar errores de base de datos', async () => {
      const dbError = new Error('Database connection error');
      pool.query.mockRejectedValue(dbError);

      await getVideosByStudyId(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener clips del estudio:', dbError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener los clips del estudio'
      });
    });
  });
}); 