import { Request, Response } from 'express';
import { generateUploadUrl, uploadCallback } from '../../../src/controllers/videoController/uploadVideo';

// Mock de AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: jest.fn()
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn()
}));

// Mock de la base de datos
jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Mock del logger
jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

// Mock de S3
jest.mock('../../../src/config/s3', () => ({
  S3_CLIENT: {}
}));

// Mock de config
jest.mock('../../../src/config', () => ({
  config: {
    S3_BUCKET: 'test-bucket'
  }
}));

// Mock de generateThumbnail
jest.mock('../../../src/controllers/thumbnailController/generateThumbnail', () => ({
  generateThumbnail: jest.fn()
}));

const { pool } = require('../../../src/config/db');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../../../src/config/logger');
const { generateThumbnail } = require('../../../src/controllers/thumbnailController/generateThumbnail');

describe('uploadVideo Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReq = {
      body: {}
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

  describe('generateUploadUrl', () => {
    describe('Casos exitosos', () => {
      test('debe generar URL de upload exitosamente', async () => {
        const mockRequestData = {
          fileName: 'test-video.mp4',
          contentType: 'video/mp4',
          studyId: 123,
          sizeBytes: 1048576,
          userId: 456,
          protocol: 'test-protocol',
          tagIds: [1, 2, 3]
        };
        mockReq.body = mockRequestData;

        const mockUploadUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url';
        const mockClipId = 789;
        const mockKey = `users/456/${Date.now()}_test-video.mp4`;

        getSignedUrl.mockResolvedValue(mockUploadUrl);
        pool.query.mockResolvedValue({
          rows: [{ id: mockClipId }]
        });

        // Mock Date.now para tener un key predecible
        const mockNow = 1640995200000;
        jest.spyOn(Date, 'now').mockReturnValue(mockNow);

        await generateUploadUrl(mockReq as Request, mockRes as Response);

        expect(PutObjectCommand).toHaveBeenCalledWith({
          Bucket: 'test-bucket',
          Key: `users/456/${mockNow}_test-video.mp4`,
          ContentType: 'video/mp4'
        });

        expect(getSignedUrl).toHaveBeenCalledWith(
          {},
          expect.any(Object),
          { expiresIn: 600 }
        );

        expect(pool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO video_clip'),
          [123, `users/456/${mockNow}_test-video.mp4`, 'test-video.mp4', 'video/mp4', 1048576, 'test-protocol']
        );

        expect(logger.info).toHaveBeenCalledWith(
          `Clip creado (ID ${mockClipId}) con protocolo "test-protocol".`
        );

        expect(mockRes.json).toHaveBeenCalledWith({
          uploadUrl: mockUploadUrl,
          clipId: mockClipId,
          key: `users/456/${mockNow}_test-video.mp4`
        });

        Date.now = jest.fn().mockRestore();
      });

      test('debe manejar diferentes tipos de archivo', async () => {
        const mockRequestData = {
          fileName: 'test-video.avi',
          contentType: 'video/x-msvideo',
          studyId: 124,
          sizeBytes: 2097152,
          userId: 457,
          protocol: 'avi-protocol',
          tagIds: []
        };
        mockReq.body = mockRequestData;

        const mockUploadUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url-avi';
        const mockClipId = 790;

        getSignedUrl.mockResolvedValue(mockUploadUrl);
        pool.query.mockResolvedValue({
          rows: [{ id: mockClipId }]
        });

        const mockNow = 1640995200001;
        jest.spyOn(Date, 'now').mockReturnValue(mockNow);

        await generateUploadUrl(mockReq as Request, mockRes as Response);

        expect(PutObjectCommand).toHaveBeenCalledWith({
          Bucket: 'test-bucket',
          Key: `users/457/${mockNow}_test-video.avi`,
          ContentType: 'video/x-msvideo'
        });

        expect(mockRes.json).toHaveBeenCalledWith({
          uploadUrl: mockUploadUrl,
          clipId: mockClipId,
          key: `users/457/${mockNow}_test-video.avi`
        });

        Date.now = jest.fn().mockRestore();
      });

      test('debe usar la query SQL correcta para insertar video_clip', async () => {
        const mockRequestData = {
          fileName: 'query-test.mp4',
          contentType: 'video/mp4',
          studyId: 125,
          sizeBytes: 3145728,
          userId: 458,
          protocol: 'query-protocol',
          tagIds: [4, 5]
        };
        mockReq.body = mockRequestData;

        getSignedUrl.mockResolvedValue('https://test-url.com');
        pool.query.mockResolvedValue({
          rows: [{ id: 791 }]
        });

        await generateUploadUrl(mockReq as Request, mockRes as Response);

        const calledQuery = pool.query.mock.calls[0][0];
        expect(calledQuery).toContain('INSERT INTO video_clip');
        expect(calledQuery).toContain('study_id, object_key, original_filename, mime_type, duration_seconds');
        expect(calledQuery).toContain('size_bytes, order_index, protocol');
        expect(calledQuery).toContain('VALUES (');
        expect(calledQuery).toContain('$1, $2, $3, $4, NULL');
        expect(calledQuery).toContain('$5');
        expect(calledQuery).toContain('SELECT COALESCE(MAX(order_index), 0) + 1');
        expect(calledQuery).toContain('FROM video_clip');
        expect(calledQuery).toContain('WHERE study_id = $1');
        expect(calledQuery).toContain('$6');
        expect(calledQuery).toContain('RETURNING id');
      });
    });

    describe('Manejo de errores', () => {
      test('debe manejar errores de S3 getSignedUrl', async () => {
        const mockRequestData = {
          fileName: 'error-test.mp4',
          contentType: 'video/mp4',
          studyId: 126,
          sizeBytes: 1048576,
          userId: 459,
          protocol: 'error-protocol',
          tagIds: []
        };
        mockReq.body = mockRequestData;

        const s3Error = new Error('S3 service unavailable');
        getSignedUrl.mockRejectedValue(s3Error);

        await generateUploadUrl(mockReq as Request, mockRes as Response);

        expect(logger.error).toHaveBeenCalledWith(
          'Error al generar la URL prefirmada o insertar clip:',
          { error: s3Error }
        );
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg: 'Error al generar la URL para subir el video'
        });
      });

      test('debe manejar errores de base de datos', async () => {
        const mockRequestData = {
          fileName: 'db-error-test.mp4',
          contentType: 'video/mp4',
          studyId: 127,
          sizeBytes: 1048576,
          userId: 460,
          protocol: 'db-error-protocol',
          tagIds: []
        };
        mockReq.body = mockRequestData;

        const mockUploadUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url';
        getSignedUrl.mockResolvedValue(mockUploadUrl);

        const dbError = new Error('Database connection failed');
        pool.query.mockRejectedValue(dbError);

        await generateUploadUrl(mockReq as Request, mockRes as Response);

        expect(logger.error).toHaveBeenCalledWith(
          'Error al generar la URL prefirmada o insertar clip:',
          { error: dbError }
        );
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg: 'Error al generar la URL para subir el video'
        });
      });

      test('debe manejar errores de foreign key constraint', async () => {
        const mockRequestData = {
          fileName: 'fk-error-test.mp4',
          contentType: 'video/mp4',
          studyId: 999999, // Study que no existe
          sizeBytes: 1048576,
          userId: 461,
          protocol: 'fk-error-protocol',
          tagIds: []
        };
        mockReq.body = mockRequestData;

        getSignedUrl.mockResolvedValue('https://test-url.com');

        const fkError = new Error('insert or update on table "video_clip" violates foreign key constraint');
        pool.query.mockRejectedValue(fkError);

        await generateUploadUrl(mockReq as Request, mockRes as Response);

        expect(logger.error).toHaveBeenCalledWith(
          'Error al generar la URL prefirmada o insertar clip:',
          { error: fkError }
        );
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg: 'Error al generar la URL para subir el video'
        });
      });
    });

    describe('Casos edge', () => {
      test('debe manejar nombres de archivo con caracteres especiales', async () => {
        const mockRequestData = {
          fileName: 'test-video_with-special@chars!.mp4',
          contentType: 'video/mp4',
          studyId: 128,
          sizeBytes: 1048576,
          userId: 462,
          protocol: 'special-chars-protocol',
          tagIds: [6]
        };
        mockReq.body = mockRequestData;

        getSignedUrl.mockResolvedValue('https://test-url.com');
        pool.query.mockResolvedValue({
          rows: [{ id: 792 }]
        });

        const mockNow = 1640995200002;
        jest.spyOn(Date, 'now').mockReturnValue(mockNow);

        await generateUploadUrl(mockReq as Request, mockRes as Response);

        expect(pool.query).toHaveBeenCalledWith(
          expect.any(String),
          [128, `users/462/${mockNow}_test-video_with-special@chars!.mp4`, 'test-video_with-special@chars!.mp4', 'video/mp4', 1048576, 'special-chars-protocol']
        );

        Date.now = jest.fn().mockRestore();
      });

      test('debe manejar archivos muy grandes', async () => {
        const mockRequestData = {
          fileName: 'large-video.mp4',
          contentType: 'video/mp4',
          studyId: 129,
          sizeBytes: 5368709120, // 5GB
          userId: 463,
          protocol: 'large-file-protocol',
          tagIds: []
        };
        mockReq.body = mockRequestData;

        getSignedUrl.mockResolvedValue('https://test-url.com');
        pool.query.mockResolvedValue({
          rows: [{ id: 793 }]
        });

        await generateUploadUrl(mockReq as Request, mockRes as Response);

        expect(pool.query).toHaveBeenCalledWith(
          expect.any(String),
          [129, expect.any(String), 'large-video.mp4', 'video/mp4', 5368709120, 'large-file-protocol']
        );
      });

      test('debe manejar protocolos con caracteres especiales', async () => {
        const mockRequestData = {
          fileName: 'protocol-test.mp4',
          contentType: 'video/mp4',
          studyId: 130,
          sizeBytes: 1048576,
          userId: 464,
          protocol: 'protocol-with-special_chars@123!',
          tagIds: [7, 8, 9]
        };
        mockReq.body = mockRequestData;

        getSignedUrl.mockResolvedValue('https://test-url.com');
        pool.query.mockResolvedValue({
          rows: [{ id: 794 }]
        });

        await generateUploadUrl(mockReq as Request, mockRes as Response);

        expect(logger.info).toHaveBeenCalledWith(
          'Clip creado (ID 794) con protocolo "protocol-with-special_chars@123!".'
        );
      });
    });
  });

  describe('uploadCallback', () => {
    describe('Casos exitosos', () => {
      test('debe procesar callback de upload exitosamente', async () => {
        const mockRequestData = {
          key: 'users/456/1640995200000_test-video.mp4',
          videoId: 789
        };
        mockReq.body = mockRequestData;

        generateThumbnail.mockResolvedValue(undefined);

        await uploadCallback(mockReq as Request, mockRes as Response);

        expect(generateThumbnail).toHaveBeenCalledWith('users/456/1640995200000_test-video.mp4');
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          thumbnailKey: 'users/456/1640995200000_test-video.jpg'
        });
      });

      test('debe generar thumbnailKey correctamente para diferentes rutas', async () => {
        const mockRequestData = {
          key: 'videos/test-folder/sample-video.mp4',
          videoId: 790
        };
        mockReq.body = mockRequestData;

        generateThumbnail.mockResolvedValue(undefined);

        await uploadCallback(mockReq as Request, mockRes as Response);

        expect(generateThumbnail).toHaveBeenCalledWith('videos/test-folder/sample-video.mp4');
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          thumbnailKey: 'videos/thumbnails/test-folder/sample-video.jpg'
        });
      });

      test('debe manejar keys sin extensión mp4', async () => {
        const mockRequestData = {
          key: 'users/456/1640995200000_test-video.avi',
          videoId: 791
        };
        mockReq.body = mockRequestData;

        generateThumbnail.mockResolvedValue(undefined);

        await uploadCallback(mockReq as Request, mockRes as Response);

        expect(generateThumbnail).toHaveBeenCalledWith('users/456/1640995200000_test-video.avi');
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          thumbnailKey: 'users/456/1640995200000_test-video.avi'
        });
      });
    });

    describe('Manejo de errores', () => {
      test('debe manejar errores de generateThumbnail', async () => {
        const mockRequestData = {
          key: 'users/456/1640995200000_error-video.mp4',
          videoId: 792
        };
        mockReq.body = mockRequestData;

        const thumbnailError = new Error('Thumbnail generation failed');
        generateThumbnail.mockRejectedValue(thumbnailError);

        await uploadCallback(mockReq as Request, mockRes as Response);

        expect(generateThumbnail).toHaveBeenCalledWith('users/456/1640995200000_error-video.mp4');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error al generar thumbnail:', thumbnailError);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'No se pudo generar la miniatura'
        });
      });

      test('debe manejar errores de timeout en generateThumbnail', async () => {
        const mockRequestData = {
          key: 'users/456/1640995200000_timeout-video.mp4',
          videoId: 793
        };
        mockReq.body = mockRequestData;

        const timeoutError = new Error('Thumbnail generation timeout');
        generateThumbnail.mockRejectedValue(timeoutError);

        await uploadCallback(mockReq as Request, mockRes as Response);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error al generar thumbnail:', timeoutError);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'No se pudo generar la miniatura'
        });
      });
    });

    describe('Casos edge', () => {
      test('debe manejar keys con rutas complejas', async () => {
        const mockRequestData = {
          key: 'users/456/folder/subfolder/complex-path_video.mp4',
          videoId: 794
        };
        mockReq.body = mockRequestData;

        generateThumbnail.mockResolvedValue(undefined);

        await uploadCallback(mockReq as Request, mockRes as Response);

        expect(generateThumbnail).toHaveBeenCalledWith('users/456/folder/subfolder/complex-path_video.mp4');
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          thumbnailKey: 'users/456/folder/subfolder/complex-path_video.jpg'
        });
      });

      test('debe manejar videoId como string', async () => {
        const mockRequestData = {
          key: 'users/456/1640995200000_string-id-video.mp4',
          videoId: '795'
        };
        mockReq.body = mockRequestData;

        generateThumbnail.mockResolvedValue(undefined);

        await uploadCallback(mockReq as Request, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          thumbnailKey: 'users/456/1640995200000_string-id-video.jpg'
        });
      });

      test('debe manejar keys con caracteres especiales', async () => {
        const mockRequestData = {
          key: 'users/456/test-video_with@special#chars!.mp4',
          videoId: 796
        };
        mockReq.body = mockRequestData;

        generateThumbnail.mockResolvedValue(undefined);

        await uploadCallback(mockReq as Request, mockRes as Response);

        expect(generateThumbnail).toHaveBeenCalledWith('users/456/test-video_with@special#chars!.mp4');
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          thumbnailKey: 'users/456/test-video_with@special#chars!.jpg'
        });
      });
    });
  });
}); 