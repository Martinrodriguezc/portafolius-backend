import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../src/middleware/authenticateToken';

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
  PutObjectCommand: jest.fn(),
}));

// Mock de variables de entorno
process.env.S3_BUCKET = 'test-bucket';

import { createMaterial } from '../../../src/controllers/materialController/createMaterial';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';
import { S3_CLIENT } from '../../../src/config/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// Referencias a los mocks
const mockPool = pool as jest.Mocked<typeof pool>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockS3Client = S3_CLIENT as jest.Mocked<typeof S3_CLIENT>;
const mockPutObjectCommand = PutObjectCommand as jest.MockedClass<typeof PutObjectCommand>;

describe('CreateMaterial Controller - Tests Unitarios', () => {
  let mockReq: Partial<AuthenticatedRequest & { file?: Express.Multer.File }>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Reset de todos los mocks
    jest.clearAllMocks();

    // Setup del request base
    mockReq = {
      user: {
        id: 1,
        email: 'teacher@example.com',
        role: 'profesor'
      },
      body: {},
    };

    // Setup del response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Setup del next
    mockNext = jest.fn();
  });

  describe('Casos exitosos - Material tipo link', () => {
    test('1. Debe crear material tipo link exitosamente', async () => {
      const teacherId = 1;
      const materialData = {
        type: 'link',
        title: 'Test Link Material',
        description: 'Test Description',
        url: 'https://example.com/resource',
        studentIds: JSON.stringify([1, 2, 3])
      };

      mockReq.body = materialData;

      // Mock de respuesta de inserción de material
      const mockInsertResult = {
        rows: [{ id: 123 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      // Verificar inserción de material
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO material'),
        ['link', 'Test Link Material', 'Test Description', 'https://example.com/resource', null, null, teacherId, null]
      );

      // Verificar asignaciones a estudiantes (3 llamadas)
      expect(mockPool.query).toHaveBeenCalledTimes(4); // 1 insert + 3 assignments

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        materialId: 123,
        url: 'https://example.com/resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('2. Debe crear material tipo link sin estudiantes asignados', async () => {
      const materialData = {
        type: 'link',
        title: 'Link Without Students',
        description: 'Description',
        url: 'https://example.com/no-students'
      };

      mockReq.body = materialData;

      const mockInsertResult = {
        rows: [{ id: 456 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      // Solo debe haber 1 query (inserción de material)
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        materialId: 456,
        url: 'https://example.com/no-students'
      });
    });
  });

  describe('Casos exitosos - Material tipo archivo', () => {
    test('3. Debe crear material con archivo exitosamente', async () => {
      const teacherId = 1;
      const materialData = {
        type: 'file',
        title: 'Test File Material',
        description: 'File Description',
        studentIds: JSON.stringify([1, 2])
      };

      const mockFile = {
        originalname: 'test-document.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test file content')
      };

      mockReq.body = materialData;
      mockReq.file = mockFile as Express.Multer.File;

      // Mock de S3 upload
      mockS3Client.send.mockResolvedValue({} as any);

      // Mock de respuesta de inserción
      const mockInsertResult = {
        rows: [{ id: 789 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      // Verificar que se creó el comando S3
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expect.stringMatching(/^materials\/\d+-test-document\.pdf$/),
        Body: mockFile.buffer,
        ContentType: 'application/pdf',
        ContentLength: 1024,
      });

      // Verificar que se envió el comando a S3
      expect(mockS3Client.send).toHaveBeenCalledTimes(1);

      // Verificar inserción de material
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO material'),
        ['file', 'Test File Material', 'File Description', expect.stringMatching(/^materials\/\d+-test-document\.pdf$/), 1024, 'application/pdf', teacherId, null]
      );

      // Verificar asignaciones (1 insert + 2 assignments)
      expect(mockPool.query).toHaveBeenCalledTimes(3);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        materialId: 789,
        url: expect.stringMatching(/^materials\/\d+-test-document\.pdf$/)
      });
    });

    test('4. Debe limpiar nombres de archivo con caracteres especiales', async () => {
      const materialData = {
        type: 'file',
        title: 'Special Chars File',
        description: 'Description'
      };

      const mockFile = {
        originalname: 'test file@#$%&*()!.pdf',
        mimetype: 'application/pdf',
        size: 512,
        buffer: Buffer.from('test content')
      };

      mockReq.body = materialData;
      mockReq.file = mockFile as Express.Multer.File;

      mockS3Client.send.mockResolvedValue({} as any);

      const mockInsertResult = {
        rows: [{ id: 999 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      // El nombre debe estar limpio
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expect.stringMatching(/^materials\/\d+-test_file_________.pdf$/),
        Body: mockFile.buffer,
        ContentType: 'application/pdf',
        ContentLength: 512,
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Casos de error - Validación de parámetros', () => {
    test('5. Debe retornar error 400 cuando falta URL para material tipo link', async () => {
      const materialData = {
        type: 'link',
        title: 'Link Without URL',
        description: 'Description'
      };

      mockReq.body = materialData;

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Falta URL para enlace'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('6. Debe retornar error 400 cuando falta archivo para material tipo file', async () => {
      const materialData = {
        type: 'file',
        title: 'File Without Upload',
        description: 'Description'
      };

      mockReq.body = materialData;
      // No se asigna mockReq.file

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Falta archivo adjunto'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockS3Client.send).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('7. Debe manejar studentIds como array vacío cuando no se proporciona', async () => {
      const materialData = {
        type: 'link',
        title: 'Link Material',
        description: 'Description',
        url: 'https://example.com/test'
      };

      mockReq.body = materialData;

      const mockInsertResult = {
        rows: [{ id: 111 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      // Solo una query (inserción de material, sin asignaciones)
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('8. Debe manejar errores de inserción de material', async () => {
      const materialData = {
        type: 'link',
        title: 'Test Material',
        description: 'Description',
        url: 'https://example.com/test'
      };

      mockReq.body = materialData;

      const dbError = new Error('Database insertion failed');
      mockPool.query.mockRejectedValue(dbError);

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating material:',
        dbError
      );
      expect(mockNext).toHaveBeenCalledWith(dbError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('9. Debe manejar errores de asignación a estudiantes', async () => {
      const materialData = {
        type: 'link',
        title: 'Test Material',
        description: 'Description',
        url: 'https://example.com/test',
        studentIds: JSON.stringify([1])
      };

      mockReq.body = materialData;

      // Primera query exitosa (inserción), segunda falla (asignación)
      const mockInsertResult = {
        rows: [{ id: 123 }],
        rowCount: 1,
      };
      const assignmentError = new Error('Assignment failed');
      
      mockPool.query
        .mockResolvedValueOnce(mockInsertResult)
        .mockRejectedValueOnce(assignmentError);

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating material:',
        assignmentError
      );
      expect(mockNext).toHaveBeenCalledWith(assignmentError);
    });
  });

  describe('Casos de error - AWS S3', () => {
    test('10. Debe manejar errores de subida a S3', async () => {
      const materialData = {
        type: 'file',
        title: 'File Material',
        description: 'Description'
      };

      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test content')
      };

      mockReq.body = materialData;
      mockReq.file = mockFile as Express.Multer.File;

      const s3Error = new Error('S3 upload failed');
      mockS3Client.send.mockRejectedValue(s3Error);

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating material:',
        s3Error
      );
      expect(mockNext).toHaveBeenCalledWith(s3Error);
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Estructura de respuesta', () => {
    test('11. Debe retornar estructura correcta para material exitoso', async () => {
      const materialData = {
        type: 'link',
        title: 'Response Test',
        description: 'Description',
        url: 'https://example.com/response'
      };

      mockReq.body = materialData;

      const mockInsertResult = {
        rows: [{ id: 555 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          materialId: expect.any(Number),
          url: expect.any(String),
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        materialId: 555,
        url: 'https://example.com/response'
      });
    });

    test('12. Debe retornar estructura correcta para error 400', async () => {
      const materialData = {
        type: 'link',
        title: 'Error Test'
        // Falta URL
      };

      mockReq.body = materialData;

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.any(String),
        })
      );
    });
  });

  describe('Logging y auditoría', () => {
    test('13. Debe registrar errores con detalles completos', async () => {
      const materialData = {
        type: 'link',
        title: 'Log Test',
        description: 'Description',
        url: 'https://example.com/log'
      };

      mockReq.body = materialData;

      const specificError = new Error('Specific database error');
      mockPool.query.mockRejectedValue(specificError);

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating material:',
        specificError
      );
    });

    test('14. Debe llamar a next con el error para manejo de middleware', async () => {
      const materialData = {
        type: 'link',
        title: 'Next Test',
        description: 'Description',
        url: 'https://example.com/next'
      };

      mockReq.body = materialData;

      const middlewareError = new Error('Middleware error');
      mockPool.query.mockRejectedValue(middlewareError);

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(middlewareError);
    });
  });

  describe('Flujo de ejecución', () => {
    test('15. Debe validar tipo de material antes de procesar', async () => {
      const materialData = {
        type: 'link',
        title: 'Validation Test'
        // Sin URL - debe fallar validación
      };

      mockReq.body = materialData;

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      // No debe ejecutar queries de DB si falla validación
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockS3Client.send).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('16. Debe procesar asignaciones en orden correcto', async () => {
      const materialData = {
        type: 'link',
        title: 'Order Test',
        description: 'Description',
        url: 'https://example.com/order',
        studentIds: JSON.stringify([10, 20])
      };

      mockReq.body = materialData;

      const mockInsertResult = {
        rows: [{ id: 666 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      await createMaterial(
        mockReq as AuthenticatedRequest & { file?: Express.Multer.File },
        mockRes as Response,
        mockNext
      );

      // Verificar orden de calls: 1 inserción + 2 asignaciones
      expect(mockPool.query).toHaveBeenCalledTimes(3);
      
      // Primera call: inserción de material
      expect(mockPool.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('INSERT INTO material'),
        expect.any(Array)
      );

      // Siguientes calls: asignaciones
      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO material_assignment'),
        [666, 10, 1]
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('INSERT INTO material_assignment'),
        [666, 20, 1]
      );
    });
  });
}); 