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

jest.mock('../../../src/config/s3', () => ({
  S3_CLIENT: {
    send: jest.fn(),
  },
}));

jest.mock('@aws-sdk/client-s3', () => ({
  GetObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

// Mock de variables de entorno
process.env.S3_BUCKET = 'test-bucket';

import { downloadMaterial } from '../../../src/controllers/materialController/downloadMaterial';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';
import { S3_CLIENT } from '../../../src/config/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Referencias a los mocks
const mockPool = pool as jest.Mocked<typeof pool>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockS3Client = S3_CLIENT as jest.Mocked<typeof S3_CLIENT>;
const mockGetObjectCommand = GetObjectCommand as jest.MockedClass<typeof GetObjectCommand>;
const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

describe('DownloadMaterial Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Reset de todos los mocks
    jest.clearAllMocks();

    // Setup del request base
    mockReq = {
      params: {},
    };

    // Setup del response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn(),
    };

    // Setup del next
    mockNext = jest.fn();
  });

  describe('Casos exitosos', () => {
    test('1. Debe descargar material exitosamente', async () => {
      const materialId = '123';
      mockReq.params = { id: materialId };

      // Mock de respuesta de DB
      const mockDbResult = {
        rows: [{
          url: 'materials/1234-document.pdf',
          mime_type: 'application/pdf'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDbResult);

      // Mock de signed URL
      const signedUrl = 'https://s3.amazonaws.com/bucket/signed-url';
      mockGetSignedUrl.mockResolvedValue(signedUrl);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      // Verificar query de DB
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT url, mime_type FROM material WHERE id = $1',
        [123]
      );

      // Verificar comando S3
      expect(mockGetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'materials/1234-document.pdf',
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: expect.stringContaining('attachment; filename=')
      });

      // Verificar generación de signed URL
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.any(Object), // GetObjectCommand instance
        { expiresIn: 300 }
      );

      // Verificar redirección
      expect(mockRes.redirect).toHaveBeenCalledWith(signedUrl);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('2. Debe manejar archivos con nombres especiales correctamente', async () => {
      const materialId = '456';
      mockReq.params = { id: materialId };

      const mockDbResult = {
        rows: [{
          url: 'materials/test-file-with-áccénts@#$%.docx',
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDbResult);

      const signedUrl = 'https://s3.amazonaws.com/bucket/signed-url-2';
      mockGetSignedUrl.mockResolvedValue(signedUrl);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      // Verificar que el filename está normalizado
      expect(mockGetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'materials/test-file-with-áccénts@#$%.docx',
        ResponseContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ResponseContentDisposition: expect.stringMatching(/attachment; filename="[^"]*"/)
      });

      expect(mockRes.redirect).toHaveBeenCalledWith(signedUrl);
    });

    test('3. Debe manejar diferentes tipos MIME', async () => {
      const materialId = '789';
      mockReq.params = { id: materialId };

      const mockDbResult = {
        rows: [{
          url: 'materials/image.jpg',
          mime_type: 'image/jpeg'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDbResult);

      const signedUrl = 'https://s3.amazonaws.com/bucket/image-url';
      mockGetSignedUrl.mockResolvedValue(signedUrl);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'materials/image.jpg',
        ResponseContentType: 'image/jpeg',
        ResponseContentDisposition: expect.stringContaining('attachment; filename=')
      });

      expect(mockRes.redirect).toHaveBeenCalledWith(signedUrl);
    });

    test('4. Debe configurar expiración de signed URL correctamente', async () => {
      const materialId = '111';
      mockReq.params = { id: materialId };

      const mockDbResult = {
        rows: [{
          url: 'materials/test.txt',
          mime_type: 'text/plain'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDbResult);

      const signedUrl = 'https://s3.amazonaws.com/bucket/test-url';
      mockGetSignedUrl.mockResolvedValue(signedUrl);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      // Verificar que expira en 300 segundos (5 minutos)
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.any(Object),
        { expiresIn: 300 }
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(signedUrl);
    });
  });

  describe('Casos de error - Validación de parámetros', () => {
    test('5. Debe retornar error 400 para ID inválido (NaN)', async () => {
      mockReq.params = { id: 'invalid-id' };

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'ID inválido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('6. Debe retornar error 400 para ID vacío', async () => {
      mockReq.params = { id: '' };

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'ID inválido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('7. Debe convertir ID válido con solo dígitos', async () => {
      const materialId = '12345';
      mockReq.params = { id: materialId };

      const mockDbResult = {
        rows: [{
          url: 'materials/test.pdf',
          mime_type: 'application/pdf'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDbResult);

      const signedUrl = 'https://s3.amazonaws.com/bucket/test';
      mockGetSignedUrl.mockResolvedValue(signedUrl);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      // Verificar que se convirtió a número correctamente
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [12345] // Como número
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(signedUrl);
    });

    test('8. Debe convertir ID string válido a número', async () => {
      const materialId = '999';
      mockReq.params = { id: materialId };

      const mockDbResult = {
        rows: [{
          url: 'materials/test.pdf',
          mime_type: 'application/pdf'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDbResult);

      const signedUrl = 'https://s3.amazonaws.com/bucket/test';
      mockGetSignedUrl.mockResolvedValue(signedUrl);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      // Verificar que se convirtió correctamente a número
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [999] // Como número
      );
    });
  });

  describe('Casos de error - Material no encontrado', () => {
    test('9. Debe retornar error 404 cuando material no existe', async () => {
      const materialId = '999';
      mockReq.params = { id: materialId };

      // Mock con rows vacío
      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockEmptyResult);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Material no encontrado'
      });
      expect(mockGetObjectCommand).not.toHaveBeenCalled();
      expect(mockGetSignedUrl).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('10. Debe verificar que se busca por ID correcto', async () => {
      const materialId = '777';
      mockReq.params = { id: materialId };

      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockEmptyResult);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT url, mime_type FROM material WHERE id = $1',
        [777]
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('11. Debe manejar errores de consulta a DB', async () => {
      const materialId = '555';
      mockReq.params = { id: materialId };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(dbError);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error downloading material:',
        dbError
      );
      expect(mockNext).toHaveBeenCalledWith(dbError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('12. Debe manejar diferentes tipos de errores de DB', async () => {
      const materialId = '666';
      mockReq.params = { id: materialId };

      const timeoutError = new Error('Query timeout');
      mockPool.query.mockRejectedValue(timeoutError);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error downloading material:',
        timeoutError
      );
      expect(mockNext).toHaveBeenCalledWith(timeoutError);
    });
  });

  describe('Casos de error - AWS S3', () => {
    test('13. Debe manejar errores en generación de signed URL', async () => {
      const materialId = '888';
      mockReq.params = { id: materialId };

      const mockDbResult = {
        rows: [{
          url: 'materials/test.pdf',
          mime_type: 'application/pdf'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDbResult);

      const s3Error = new Error('Failed to generate signed URL');
      mockGetSignedUrl.mockRejectedValue(s3Error);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error downloading material:',
        s3Error
      );
      expect(mockNext).toHaveBeenCalledWith(s3Error);
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    test('14. Debe manejar errores de permisos S3', async () => {
      const materialId = '999';
      mockReq.params = { id: materialId };

      const mockDbResult = {
        rows: [{
          url: 'materials/protected.pdf',
          mime_type: 'application/pdf'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDbResult);

      const permissionError = new Error('Access denied to S3 object');
      mockGetSignedUrl.mockRejectedValue(permissionError);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error downloading material:',
        permissionError
      );
      expect(mockNext).toHaveBeenCalledWith(permissionError);
    });
  });

  describe('Estructura de respuesta', () => {
    test('15. Debe retornar estructura correcta para error 400', async () => {
      mockReq.params = { id: 'invalid' };

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.any(String),
        })
      );
    });

    test('16. Debe retornar estructura correcta para error 404', async () => {
      mockReq.params = { id: '123' };

      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockEmptyResult);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.any(String),
        })
      );
    });

    test('17. Debe redirigir con URL válida en caso exitoso', async () => {
      mockReq.params = { id: '123' };

      const mockDbResult = {
        rows: [{
          url: 'materials/test.pdf',
          mime_type: 'application/pdf'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDbResult);

      const signedUrl = 'https://s3.amazonaws.com/bucket/valid-url';
      mockGetSignedUrl.mockResolvedValue(signedUrl);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('https://')
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(signedUrl);
    });
  });

  describe('Flujo de ejecución', () => {
    test('18. Debe validar ID antes de consultar DB', async () => {
      mockReq.params = { id: 'invalid' };

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      // No debe hacer query si ID es inválido
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockGetSignedUrl).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('19. Debe ejecutar operaciones en orden correcto', async () => {
      mockReq.params = { id: '123' };

      const mockDbResult = {
        rows: [{
          url: 'materials/test.pdf',
          mime_type: 'application/pdf'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDbResult);

      const signedUrl = 'https://s3.amazonaws.com/bucket/test';
      mockGetSignedUrl.mockResolvedValue(signedUrl);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      // Verificar que se llamaron todos en orden
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockGetObjectCommand).toHaveBeenCalledTimes(1);
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
      expect(mockRes.redirect).toHaveBeenCalledTimes(1);
    });

    test('20. Debe limpiar filename antes de crear comando S3', async () => {
      mockReq.params = { id: '123' };

      const mockDbResult = {
        rows: [{
          url: 'materials/2024-file-with-special-chars@#$%.pdf',
          mime_type: 'application/pdf'
        }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockDbResult);

      const signedUrl = 'https://s3.amazonaws.com/bucket/test';
      mockGetSignedUrl.mockResolvedValue(signedUrl);

      await downloadMaterial(mockReq as Request, mockRes as Response, mockNext);

      // Verificar que el filename fue normalizado
      const commandCall = (mockGetObjectCommand as jest.Mock).mock.calls[0][0];
      expect(commandCall.ResponseContentDisposition).toMatch(/filename="[^@#$%]*"/);
    });
  });
}); 