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

import { getStudentMaterials } from '../../../src/controllers/materialController/getStudentMaterials';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';

// Referencias a los mocks
const mockPool = pool as jest.Mocked<typeof pool>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('GetStudentMaterials Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Reset de todos los mocks
    jest.clearAllMocks();

    // Setup del request
    mockReq = {
      params: {},
    };

    // Setup del response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Setup del next
    mockNext = jest.fn();
  });

  describe('Casos exitosos', () => {
    test('1. Debe obtener materiales del estudiante exitosamente', async () => {
      const studentId = '123';
      mockReq.params = { id: studentId };

      const mockMaterials = [
        {
          id: 1,
          type: 'document',
          title: 'Material 1',
          description: 'Descripción del material 1',
          url: 'https://example.com/material1.pdf',
          size_bytes: 1024,
          mime_type: 'application/pdf',
          upload_date: '2024-01-15T10:00:00Z',
          created_by: 1
        },
        {
          id: 2,
          type: 'video',
          title: 'Material 2',
          description: 'Descripción del material 2',
          url: 'https://example.com/material2.mp4',
          size_bytes: 2048,
          mime_type: 'video/mp4',
          upload_date: '2024-01-14T09:00:00Z',
          created_by: 2
        }
      ];

      const mockQueryResult = {
        rows: mockMaterials,
        rowCount: 2,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [123] // parseInt convierte string a number
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockMaterials);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('2. Debe manejar lista vacía de materiales', async () => {
      const studentId = '456';
      mockReq.params = { id: studentId };

      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockEmptyResult);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [456]
      );
      expect(mockRes.json).toHaveBeenCalledWith([]);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('3. Debe verificar la query SQL correcta', async () => {
      const studentId = '789';
      mockReq.params = { id: studentId };

      const mockQueryResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      const actualParams = mockPool.query.mock.calls[0][1] as number[];

      expect(actualQuery).toContain('SELECT');
      expect(actualQuery).toContain('FROM material m');
      expect(actualQuery).toContain('LEFT JOIN material_assignment ma');
      expect(actualQuery).toContain('WHERE');
      expect(actualQuery).toContain('m.student_id = $1');
      expect(actualQuery).toContain('ORDER BY m.uploaded_at DESC');
      expect(actualParams).toEqual([789]);
    });

    test('4. Debe retornar materiales con estructura correcta', async () => {
      const studentId = '999';
      mockReq.params = { id: studentId };

      const mockMaterial = {
        id: 1,
        type: 'image',
        title: 'Test Material',
        description: 'Test Description',
        url: 'https://example.com/test.jpg',
        size_bytes: 512,
        mime_type: 'image/jpeg',
        upload_date: '2024-01-10T08:00:00Z',
        created_by: 3
      };

      const mockQueryResult = {
        rows: [mockMaterial],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith([mockMaterial]);
      expect(Array.isArray([mockMaterial])).toBe(true);
    });
  });

  describe('Validación de parámetros', () => {
    test('5. Debe retornar error 400 cuando el ID es inválido', async () => {
      const invalidId = 'abc';
      mockReq.params = { id: invalidId };

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'ID de estudiante inválido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('6. Debe retornar error 400 cuando el ID está vacío', async () => {
      const emptyId = '';
      mockReq.params = { id: emptyId };

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'ID de estudiante inválido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('7. Debe manejar IDs con números decimales', async () => {
      const floatId = '123.45';
      mockReq.params = { id: floatId };

      const mockQueryResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      // parseInt('123.45') = 123, es válido
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [123] // parseInt convierte 123.45 a 123
      );
      expect(mockRes.json).toHaveBeenCalledWith([]);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('8. Debe procesar IDs numéricos válidos correctamente', async () => {
      const validId = '12345';
      mockReq.params = { id: validId };

      const mockQueryResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [12345] // Convertido a número
      );
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('Manejo de errores de base de datos', () => {
    test('9. Debe manejar errores de conexión de base de datos', async () => {
      const studentId = '123';
      mockReq.params = { id: studentId };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(dbError);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching student materials:',
        dbError
      );
      expect(mockNext).toHaveBeenCalledWith(dbError);
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('10. Debe manejar diferentes tipos de errores de DB', async () => {
      const studentId = '456';
      mockReq.params = { id: studentId };

      const timeoutError = new Error('Query timeout');
      mockPool.query.mockRejectedValue(timeoutError);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching student materials:',
        timeoutError
      );
      expect(mockNext).toHaveBeenCalledWith(timeoutError);
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('11. Debe manejar errores de sintaxis SQL', async () => {
      const studentId = '789';
      mockReq.params = { id: studentId };

      const sqlError = new Error('Syntax error in SQL query');
      mockPool.query.mockRejectedValue(sqlError);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching student materials:',
        sqlError
      );
      expect(mockNext).toHaveBeenCalledWith(sqlError);
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('Estructura de respuesta', () => {
    test('12. Debe retornar array de materiales con campos correctos', async () => {
      const studentId = '111';
      mockReq.params = { id: studentId };

      const mockMaterials = [
        {
          id: 1,
          type: 'document',
          title: 'Test Material',
          description: 'Test Description',
          url: 'https://example.com/test.pdf',
          size_bytes: 1024,
          mime_type: 'application/pdf',
          upload_date: '2024-01-15T10:00:00Z',
          created_by: 1
        }
      ];

      const mockQueryResult = {
        rows: mockMaterials,
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            type: expect.any(String),
            title: expect.any(String),
            description: expect.any(String),
            url: expect.any(String),
            size_bytes: expect.any(Number),
            mime_type: expect.any(String),
            upload_date: expect.any(String),
            created_by: expect.any(Number),
          })
        ])
      );
    });

    test('13. Debe retornar estructura correcta para error 400', async () => {
      const invalidId = 'invalid';
      mockReq.params = { id: invalidId };

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.any(String),
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'ID de estudiante inválido'
      });
    });
  });

  describe('Logging y manejo de errores', () => {
    test('14. Debe registrar log de error correctamente', async () => {
      const studentId = '555';
      mockReq.params = { id: studentId };

      const specificError = new Error('Connection pool exhausted');
      mockPool.query.mockRejectedValue(specificError);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching student materials:',
        specificError
      );
    });

    test('15. Debe llamar a next con el error', async () => {
      const studentId = '666';
      mockReq.params = { id: studentId };

      const middlewareError = new Error('Middleware error');
      mockPool.query.mockRejectedValue(middlewareError);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(middlewareError);
    });
  });

  describe('Flujo de ejecución', () => {
    test('16. Debe validar ID antes de ejecutar query', async () => {
      const invalidId = 'notNumber';
      mockReq.params = { id: invalidId };

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      // No debe ejecutar query si ID es inválido
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ msg: 'ID de estudiante inválido' });
    });

    test('17. Debe ejecutar query solo con ID válido', async () => {
      const validId = '777';
      mockReq.params = { id: validId };

      const mockQueryResult = {
        rows: [],
        rowCount: 0,
      };
      mockPool.query.mockResolvedValue(mockQueryResult);

      await getStudentMaterials(mockReq as Request, mockRes as Response, mockNext);

      // Debe ejecutar query después de validar ID
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith([]);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
}); 