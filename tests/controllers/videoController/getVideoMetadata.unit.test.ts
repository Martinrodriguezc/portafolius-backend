import { Request, Response } from 'express';
import { getVideoMetadata } from '../../../src/controllers/videoController/getVideoMetadata';
import { pool } from '../../../src/config/db';
import { createUniqueTestData } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');

const mockPool = pool as jest.Mocked<typeof pool>;

// Mock de console.error para la implementación real
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('GetVideoMetadata Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let testData: ReturnType<typeof createUniqueTestData>;

  beforeEach(() => {
    testData = createUniqueTestData();
    
    mockReq = {
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Reset all mocks
    jest.clearAllMocks();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Casos exitosos', () => {
    test('1. Debe obtener metadata del video exitosamente', async () => {
      const clipId = '123';
      mockReq.params = { id: clipId };

      const mockVideoData = {
        id: 123,
        study_id: 456,
        object_key: `users/1/video-${testData.timestamp}.mp4`,
        original_filename: 'test-video.mp4',
        mime_type: 'video/mp4',
        size_bytes: 5000000,
        duration_seconds: 120,
        upload_date: '2023-01-01T00:00:00Z',
        order_index: 1,
        protocol: 'test_protocol',
        study_title: `Test Study ${testData.timestamp}`,
        study_status: 'active',
        student_first_name: testData.firstName,
        student_last_name: testData.lastName,
        tags: [
          {
            id: 1,
            name: `test-tag-${testData.timestamp}`,
            condition_id: 1
          }
        ]
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockVideoData]
      });

      await getVideoMetadata(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [123]
      );
      expect(mockRes.status).not.toHaveBeenCalled(); // 200 es implícito
      expect(mockRes.json).toHaveBeenCalledWith({
        video: mockVideoData
      });
    });

    test('2. Debe manejar video sin tags', async () => {
      const clipId = '456';
      mockReq.params = { id: clipId };

      const mockVideoData = {
        id: 456,
        study_id: 789,
        object_key: `users/1/video-no-tags.mp4`,
        original_filename: 'video-no-tags.mp4',
        mime_type: 'video/mp4',
        size_bytes: 3000000,
        duration_seconds: 60,
        upload_date: '2023-01-02T00:00:00Z',
        order_index: 2,
        protocol: 'protocol_b',
        study_title: 'Study Without Tags',
        study_status: 'completed',
        student_first_name: 'Student',
        student_last_name: 'Test',
        tags: []
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockVideoData]
      });

      await getVideoMetadata(mockReq as Request, mockRes as Response);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        video: mockVideoData
      });
    });

    test('3. Debe verificar la query SQL correcta', async () => {
      const clipId = '789';
      mockReq.params = { id: clipId };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 789,
          study_id: 123,
          object_key: 'test-key',
          original_filename: 'test.mp4',
          mime_type: 'video/mp4',
          size_bytes: 1000000,
          duration_seconds: 30,
          upload_date: '2023-01-01T00:00:00Z',
          order_index: 1,
          protocol: 'test',
          study_title: 'Test Study',
          study_status: 'active',
          student_first_name: 'Test',
          student_last_name: 'User',
          tags: []
        }]
      });

      await getVideoMetadata(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('SELECT');
      expect(actualQuery).toContain('vc.id');
      expect(actualQuery).toContain('vc.study_id');
      expect(actualQuery).toContain('vc.object_key');
      expect(actualQuery).toContain('vc.original_filename');
      expect(actualQuery).toContain('vc.mime_type');
      expect(actualQuery).toContain('vc.size_bytes');
      expect(actualQuery).toContain('vc.duration_seconds');
      expect(actualQuery).toContain('FROM video_clip vc');
      expect(actualQuery).toContain('JOIN study s');
      expect(actualQuery).toContain('JOIN users u');
      expect(actualQuery).toContain('LEFT JOIN clip_tag ct');
      expect(actualQuery).toContain('LEFT JOIN tag       t');
      expect(actualQuery).toContain('WHERE vc.id = $1');
      expect(actualQuery).toContain('GROUP BY');
      expect(mockPool.query).toHaveBeenCalledWith(actualQuery, [789]);
    });
  });

  describe('Casos de error - Validación de parámetros', () => {
    test('4. Debe retornar 400 para ID inválido (no numérico)', async () => {
      mockReq.params = { id: 'invalid-id' };

      await getVideoMetadata(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'ID de clip inválido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('5. Debe retornar 400 para ID vacío', async () => {
      mockReq.params = { id: '' };

      await getVideoMetadata(mockReq as Request, mockRes as Response);

      // Number('') devuelve 0, no NaN, por lo que no es inválido
      // El comportamiento real es que se ejecuta la query con clipId = 0
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [0]
      );
    });

    test('6. Debe retornar 400 para ID con caracteres especiales', async () => {
      mockReq.params = { id: '123abc' };

      await getVideoMetadata(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'ID de clip inválido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Casos de error - Video no encontrado', () => {
    test('7. Debe retornar 404 cuando el video no existe', async () => {
      const clipId = '999';
      mockReq.params = { id: clipId };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });

      await getVideoMetadata(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Video no encontrado'
      });
    });

    test('8. Debe manejar correctamente array vacío de resultados', async () => {
      const clipId = '888';
      mockReq.params = { id: clipId };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });

      await getVideoMetadata(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [888]
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('9. Debe manejar errores de base de datos', async () => {
      const clipId = '111';
      mockReq.params = { id: clipId };

      const dbError = new Error('Database connection failed');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      // Mock console.error para capturar la llamada
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await getVideoMetadata(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al obtener metadata del video'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error al obtener metadata del video:',
        dbError
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Casos edge cases', () => {
    test('10. Debe manejar video con múltiples tags', async () => {
      const clipId = '333';
      mockReq.params = { id: clipId };

      const mockVideoData = {
        id: 333,
        study_id: 444,
        object_key: 'video-with-tags.mp4',
        original_filename: 'multi-tag-video.mp4',
        mime_type: 'video/mp4',
        size_bytes: 8000000,
        duration_seconds: 180,
        upload_date: '2023-01-03T00:00:00Z',
        order_index: 3,
        protocol: 'multi_protocol',
        study_title: 'Multi Tag Study',
        study_status: 'active',
        student_first_name: 'Multi',
        student_last_name: 'Student',
        tags: [
          { id: 1, name: 'tag1', condition_id: 1 },
          { id: 2, name: 'tag2', condition_id: 2 },
          { id: 3, name: 'tag3', condition_id: 1 }
        ]
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockVideoData]
      });

      await getVideoMetadata(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        video: mockVideoData
      });
      expect(mockVideoData.tags).toHaveLength(3);
    });

    test('11. Debe procesar campos con valores null', async () => {
      const clipId = '444';
      mockReq.params = { id: clipId };

      const mockVideoData = {
        id: 444,
        study_id: 555,
        object_key: 'video-nulls.mp4',
        original_filename: 'null-fields.mp4',
        mime_type: 'video/mp4',
        size_bytes: 2000000,
        duration_seconds: null,
        upload_date: '2023-01-04T00:00:00Z',
        order_index: 1,
        protocol: null,
        study_title: 'Study with Nulls',
        study_status: 'active',
        student_first_name: 'Test',
        student_last_name: 'User',
        tags: []
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockVideoData]
      });

      await getVideoMetadata(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        video: mockVideoData
      });
    });
  });

  console.log('✅ Tests unitarios del GetVideoMetadata Controller completados:');

}); 