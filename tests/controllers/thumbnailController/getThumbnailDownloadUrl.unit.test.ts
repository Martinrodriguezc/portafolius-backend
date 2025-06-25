import { Request, Response } from 'express';
import { getThumbnailDownloadUrl } from '../../../src/controllers/thumbnailController/getThumbnailDownloadUrl';
import { pool } from '../../../src/config/db';
import AWS from 'aws-sdk';
import { createUniqueTestData } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');
jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    getSignedUrlPromise: jest.fn()
  }))
}));

const mockPool = pool as jest.Mocked<typeof pool>;
const mockS3 = {
  getSignedUrlPromise: jest.fn()
};

// Mock AWS S3 instance
(AWS.S3 as jest.MockedClass<typeof AWS.S3>).mockImplementation(() => mockS3 as any);

describe('GetThumbnailDownloadUrl Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let testData: ReturnType<typeof createUniqueTestData>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    testData = {
      ...createUniqueTestData(),
      userId: 123
    };
    
    mockReq = {
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Casos exitosos', () => {
    test('1. Debe generar URL de descarga de thumbnail exitosamente', async () => {
      const videoId = '123';
      const objectKey = `users/${testData.userId}/video-${testData.timestamp}.mp4`;
      const expectedThumbKey = `users/thumbnails/${testData.userId}/video-${testData.timestamp}.jpg`;
      const expectedUrl = `https://test-bucket.s3.amazonaws.com/${expectedThumbKey}?signed=true`;

      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ object_key: objectKey }]
      } as any);

      mockS3.getSignedUrlPromise.mockResolvedValueOnce(expectedUrl);

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT object_key FROM video_clip WHERE id = $1',
        [123]
      );
      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith('getObject', {
        Bucket: expect.any(String),
        Key: expectedThumbKey,
        Expires: 300
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        url: expectedUrl
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(expectedUrl);
    });

    test('2. Debe manejar diferentes extensiones de video', async () => {
      const testCases = [
        { ext: '.mp4', expectedExt: '.jpg' },
        { ext: '.mov', expectedExt: '.jpg' },
        { ext: '.avi', expectedExt: '.jpg' },
        { ext: '.mkv', expectedExt: '.jpg' }
      ];

      for (const testCase of testCases) {
        const videoId = '456';
        const objectKey = `users/${testData.userId}/video${testCase.ext}`;
        const expectedThumbKey = `users/thumbnails/${testData.userId}/video${testCase.expectedExt}`;
        const expectedUrl = `https://test-bucket.s3.amazonaws.com/${expectedThumbKey}`;

        mockReq.params = { videoId };

        mockPool.query.mockResolvedValueOnce({
          rows: [{ object_key: objectKey }]
        } as any);

        mockS3.getSignedUrlPromise.mockResolvedValueOnce(expectedUrl);

        await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

        expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith('getObject', {
          Bucket: expect.any(String),
          Key: expectedThumbKey,
          Expires: 300
        });

        jest.clearAllMocks();
      }
    });

    test('3. Debe usar tiempo de expiración de 5 minutos (300 segundos)', async () => {
      const videoId = '789';
      const objectKey = `users/${testData.userId}/test.mp4`;

      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ object_key: objectKey }]
      } as any);

      mockS3.getSignedUrlPromise.mockResolvedValueOnce('https://test-url.com');

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith('getObject', {
        Bucket: expect.any(String),
        Key: expect.any(String),
        Expires: 300
      });
    });

    test('4. Debe transformar correctamente la ruta de thumbnail', async () => {
      const videoId = '999';
      const objectKey = 'users/123/folder/subfolder/video.mp4';
      const expectedThumbKey = 'users/thumbnails/123/folder/subfolder/video.jpg';

      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ object_key: objectKey }]
      } as any);

      mockS3.getSignedUrlPromise.mockResolvedValueOnce('https://test-url.com');

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith('getObject', {
        Bucket: expect.any(String),
        Key: expectedThumbKey,
        Expires: 300
      });
    });
  });

  describe('Casos de error - Validación de parámetros', () => {
    test('5. Debe retornar 400 para videoId inválido (no numérico)', async () => {
      mockReq.params = { videoId: 'invalid-id' };

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'videoId inválido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('6. Debe retornar 400 para videoId vacío', async () => {
      mockReq.params = { videoId: '' };

      // Number('') retorna 0, así que mockeamos la DB query para que no encuentre nada
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Vídeo no encontrado'
      });
    });

    test('7. Debe retornar 400 para videoId con caracteres especiales', async () => {
      mockReq.params = { videoId: '123abc' };

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'videoId inválido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Casos de error - Video no encontrado', () => {
    test('8. Debe retornar 404 cuando el video no existe', async () => {
      const videoId = '999';
      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Vídeo no encontrado'
      });
      expect(mockS3.getSignedUrlPromise).not.toHaveBeenCalled();
    });

    test('9. Debe retornar 404 cuando object_key es null', async () => {
      const videoId = '888';
      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ object_key: null }]
      } as any);

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Vídeo no encontrado'
      });
      expect(mockS3.getSignedUrlPromise).not.toHaveBeenCalled();
    });

    test('10. Debe retornar 404 cuando object_key es undefined', async () => {
      const videoId = '777';
      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{}] // Sin object_key
      } as any);

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Vídeo no encontrado'
      });
      expect(mockS3.getSignedUrlPromise).not.toHaveBeenCalled();
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('11. Debe manejar errores de base de datos', async () => {
      const videoId = '111';
      mockReq.params = { videoId };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error interno'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error al generar URL de descarga de thumbnail:',
        dbError
      );
    });

    test('12. Debe manejar errores SQL específicos', async () => {
      const videoId = '222';
      mockReq.params = { videoId };

      const sqlError = new Error('SQL syntax error');
      mockPool.query.mockRejectedValueOnce(sqlError);

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error interno'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error al generar URL de descarga de thumbnail:',
        sqlError
      );
    });
  });

  describe('Casos de error - AWS S3', () => {
    test('13. Debe manejar errores de AWS S3', async () => {
      const videoId = '333';
      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ object_key: 'users/123/test.mp4' }]
      } as any);

      const s3Error = new Error('AWS S3 service unavailable');
      mockS3.getSignedUrlPromise.mockRejectedValueOnce(s3Error);

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error interno'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error al generar URL de descarga de thumbnail:',
        s3Error
      );
    });

    test('14. Debe manejar errores de credenciales AWS', async () => {
      const videoId = '444';
      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ object_key: 'users/123/test.mp4' }]
      } as any);

      const credentialError = new Error('Invalid AWS credentials');
      mockS3.getSignedUrlPromise.mockRejectedValueOnce(credentialError);

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error interno'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error al generar URL de descarga de thumbnail:',
        credentialError
      );
    });
  });

  describe('Casos edge cases', () => {
    test('15. Debe manejar object_key con múltiples puntos', async () => {
      const videoId = '555';
      const objectKey = 'users/123/video.backup.final.mp4';
      const expectedThumbKey = 'users/thumbnails/123/video.backup.final.jpg';

      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ object_key: objectKey }]
      } as any);

      mockS3.getSignedUrlPromise.mockResolvedValueOnce('https://test-url.com');

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith('getObject', {
        Bucket: expect.any(String),
        Key: expectedThumbKey,
        Expires: 300
      });
    });

    test('16. Debe manejar videoId con ceros al inicio', async () => {
      const videoId = '00123';
      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ object_key: 'users/123/test.mp4' }]
      } as any);

      mockS3.getSignedUrlPromise.mockResolvedValueOnce('https://test-url.com');

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT object_key FROM video_clip WHERE id = $1',
        [123] // Se convierte a número
      );
    });

    test('17. Debe manejar object_key sin extensión', async () => {
      const videoId = '666';
      const objectKey = 'users/123/video_no_extension';
      const expectedThumbKey = 'users/thumbnails/123/video_no_extension.jpg';

      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ object_key: objectKey }]
      } as any);

      mockS3.getSignedUrlPromise.mockResolvedValueOnce('https://test-url.com');

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith('getObject', {
        Bucket: expect.any(String),
        Key: expectedThumbKey,
        Expires: 300
      });
    });

    test('18. Debe manejar rutas con caracteres especiales', async () => {
      const videoId = '777';
      const objectKey = 'users/123/video with spaces & special chars.mp4';
      const expectedThumbKey = 'users/thumbnails/123/video with spaces & special chars.jpg';

      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ object_key: objectKey }]
      } as any);

      mockS3.getSignedUrlPromise.mockResolvedValueOnce('https://test-url.com');

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith('getObject', {
        Bucket: expect.any(String),
        Key: expectedThumbKey,
        Expires: 300
      });
    });
  });

  describe('Verificación de logging', () => {
    test('19. Debe logear la URL generada', async () => {
      const videoId = '888';
      const expectedUrl = 'https://example.com/signed-url';

      mockReq.params = { videoId };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ object_key: 'users/123/test.mp4' }]
      } as any);

      mockS3.getSignedUrlPromise.mockResolvedValueOnce(expectedUrl);

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(consoleLogSpy).toHaveBeenCalledWith(expectedUrl);
    });

    test('20. Debe logear errores correctamente', async () => {
      const videoId = '999';
      mockReq.params = { videoId };

      const testError = new Error('Test error');
      mockPool.query.mockRejectedValueOnce(testError);

      await getThumbnailDownloadUrl(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error al generar URL de descarga de thumbnail:',
        testError
      );
    });
  });
}); 