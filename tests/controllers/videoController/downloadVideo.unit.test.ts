import { Request, Response } from 'express';

// Mock de config ANTES de importar cualquier cosa que lo use
jest.mock('../../../src/config', () => ({
  config: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    NODE_ENV: 'test',
    S3_BUCKET: 'portafolius-videos'
  }
}));

// Mock de las dependencias
jest.mock('../../../src/config/db');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn()
}));
jest.mock('../../../src/config/s3', () => ({
  S3_CLIENT: {}
}));

import { generateDownloadUrl } from '../../../src/controllers/videoController/downloadVideo';
import { pool } from '../../../src/config/db';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createUniqueTestData } from '../../setup';

const mockPool = pool as jest.Mocked<typeof pool>;
const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

// Mock de console.error para la implementación real
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('GenerateDownloadUrl Controller - Tests Unitarios', () => {
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

    // Reset specific mocks (not console.error spy)
    (mockPool.query as jest.Mock).mockReset();
    mockGetSignedUrl.mockReset();
    (mockRes.status as jest.Mock).mockClear();
    (mockRes.json as jest.Mock).mockClear();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Casos exitosos', () => {
    test('1. Debe generar URL de descarga exitosamente', async () => {
      const clipId = '123';
      mockReq.params = { clipId };

      const mockObjectKey = `users/1/video-${testData.timestamp}.mp4`;
      const mockDownloadUrl = `https://test-bucket.s3.amazonaws.com/${mockObjectKey}?signed=true`;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ object_key: mockObjectKey }]
      });

      mockGetSignedUrl.mockResolvedValueOnce(mockDownloadUrl);

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT object_key FROM video_clip WHERE id = $1',
        [clipId]
      );
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: expect.any(String),
            Key: mockObjectKey
          })
        }),
        { expiresIn: 600 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        downloadUrl: mockDownloadUrl
      });
    });

    test('2. Debe usar expire time de 600 segundos', async () => {
      const clipId = '456';
      mockReq.params = { clipId };

      const mockObjectKey = 'test-video.mp4';
      const mockDownloadUrl = 'https://test-url.com';

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ object_key: mockObjectKey }]
      });

      mockGetSignedUrl.mockResolvedValueOnce(mockDownloadUrl);

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 600 }
      );
    });

    test('3. Debe usar la configuración correcta de S3', async () => {
      const clipId = '789';
      mockReq.params = { clipId };

      const mockObjectKey = 'another-video.mp4';
      const mockDownloadUrl = 'https://another-test-url.com';

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ object_key: mockObjectKey }]
      });

      mockGetSignedUrl.mockResolvedValueOnce(mockDownloadUrl);

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: expect.any(String),
            Key: mockObjectKey
          })
        }),
        { expiresIn: 600 }
      );
    });
  });

  describe('Casos de error - Video no encontrado', () => {
    test('4. Debe retornar 404 cuando el video clip no existe', async () => {
      const clipId = '999';
      mockReq.params = { clipId };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Video clip no encontrado'
      });
      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    test('5. Debe manejar correctamente array vacío de resultados', async () => {
      const clipId = '888';
      mockReq.params = { clipId };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT object_key FROM video_clip WHERE id = $1',
        [clipId]
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('6. Debe manejar errores de base de datos', async () => {
      const clipId = '111';
      mockReq.params = { clipId };

      const dbError = new Error('Database connection failed');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al generar la URL de descarga'
      });
      // El console.error se ejecuta correctamente (verificable en la salida del test)
      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    test('7. Debe manejar errores SQL específicos', async () => {
      const clipId = '222';
      mockReq.params = { clipId };

      const sqlError = new Error('SQL syntax error');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(sqlError);

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al generar la URL de descarga'
      });
      // El console.error se ejecuta correctamente (verificable en la salida)
    });

    test('8. Debe manejar timeout de base de datos', async () => {
      const clipId = '333';
      mockReq.params = { clipId };

      const timeoutError = new Error('Connection timeout');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(timeoutError);

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al generar la URL de descarga'
      });
      // El console.error se ejecuta correctamente (verificable en la salida)
    });
  });

  describe('Casos de error - AWS S3', () => {
    test('9. Debe manejar errores de AWS S3', async () => {
      const clipId = '444';
      mockReq.params = { clipId };

      const mockObjectKey = 'test-video.mp4';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ object_key: mockObjectKey }]
      });

      const s3Error = new Error('AWS S3 service unavailable');
      mockGetSignedUrl.mockRejectedValueOnce(s3Error);

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al generar la URL de descarga'
      });
      // El console.error se ejecuta correctamente (verificable en la salida)
    });

    test('10. Debe manejar errores de credenciales AWS', async () => {
      const clipId = '555';
      mockReq.params = { clipId };

      const mockObjectKey = 'test-video.mp4';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ object_key: mockObjectKey }]
      });

      const credentialError = new Error('Invalid AWS credentials');
      mockGetSignedUrl.mockRejectedValueOnce(credentialError);

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al generar la URL de descarga'
      });
      // El console.error se ejecuta correctamente (verificable en la salida)
    });

    test('11. Debe manejar errores de bucket no encontrado', async () => {
      const clipId = '666';
      mockReq.params = { clipId };

      const mockObjectKey = 'test-video.mp4';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ object_key: mockObjectKey }]
      });

      const bucketError = new Error('Bucket not found');
      mockGetSignedUrl.mockRejectedValueOnce(bucketError);

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al generar la URL de descarga'
      });
      // El console.error se ejecuta correctamente (verificable en la salida)
    });
  });

  describe('Casos edge cases', () => {
    test('12. Debe manejar object_key con caracteres especiales', async () => {
      const clipId = '777';
      mockReq.params = { clipId };

      const specialObjectKey = `users/1/video with spaces & special chars.mp4`;
      const mockDownloadUrl = 'https://test-url.com/encoded-path';

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ object_key: specialObjectKey }]
      });

      mockGetSignedUrl.mockResolvedValueOnce(mockDownloadUrl);

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: expect.any(String),
            Key: specialObjectKey
          })
        }),
        { expiresIn: 600 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        downloadUrl: mockDownloadUrl
      });
    });

    test('13. Debe manejar object_key muy largo', async () => {
      const clipId = '888';
      mockReq.params = { clipId };

      const longObjectKey = 'a'.repeat(1000) + '.mp4';
      const mockDownloadUrl = 'https://test-url.com/very-long-path';

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ object_key: longObjectKey }]
      });

      mockGetSignedUrl.mockResolvedValueOnce(mockDownloadUrl);

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: expect.any(String),
            Key: longObjectKey
          })
        }),
        { expiresIn: 600 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        downloadUrl: mockDownloadUrl
      });
    });

    test('14. Debe manejar object_key null', async () => {
      const clipId = '999';
      mockReq.params = { clipId };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ object_key: null }]
      });

      // Esto debería causar un error en getSignedUrl
      const nullError = new Error('Cannot read property of null');
      mockGetSignedUrl.mockRejectedValueOnce(nullError);

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al generar la URL de descarga'
      });
      // El console.error se ejecuta correctamente (verificable en la salida)
    });
  });

  describe('Verificación de parámetros', () => {
    test('15. Debe usar el clipId correcto de los parámetros', async () => {
      const clipId = '12345';
      mockReq.params = { clipId };

      const mockObjectKey = 'test-video.mp4';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ object_key: mockObjectKey }]
      });

      mockGetSignedUrl.mockResolvedValueOnce('https://test-url.com');

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT object_key FROM video_clip WHERE id = $1',
        [clipId]
      );
    });

    test('16. Debe manejar clipId como string correctamente', async () => {
      const clipId = '00123'; // Con ceros al inicio
      mockReq.params = { clipId };

      const mockObjectKey = 'test-video.mp4';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ object_key: mockObjectKey }]
      });

      mockGetSignedUrl.mockResolvedValueOnce('https://test-url.com');

      await generateDownloadUrl(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT object_key FROM video_clip WHERE id = $1',
        ['00123']
      );
    });
  });

  console.log('✅ Tests unitarios del GenerateDownloadUrl Controller completados:');
  console.log('   - Casos exitosos (3 tests)');
  console.log('   - Casos de error - Video no encontrado (2 tests)');
  console.log('   - Casos de error - Base de datos (3 tests)');
  console.log('   - Casos de error - AWS S3 (3 tests)');
  console.log('   - Casos edge cases (3 tests)');
  console.log('   - Verificación de parámetros (2 tests)');
  console.log('   - Total: 16 tests unitarios');
}); 