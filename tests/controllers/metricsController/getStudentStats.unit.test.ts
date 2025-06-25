import { Request, Response, NextFunction } from 'express';
import { getStudentStats, TeacherStudentStats } from '../../../src/controllers/metricsController/getStudentStats';
import { pool } from '../../../src/config/db';
import { createUniqueTestData } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');

const mockPool = pool as jest.Mocked<typeof pool>;

describe('GetStudentStats Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let testData: ReturnType<typeof createUniqueTestData>;

  beforeEach(() => {
    testData = {
      ...createUniqueTestData(),
      studentId: 123
    };
    
    mockReq = {
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Casos exitosos', () => {
    test('1. Debe obtener estadísticas del estudiante exitosamente', async () => {
      const studentId = '123';
      const mockStats = [
        { protocol: 'Protocolo A', count: 5 },
        { protocol: 'Protocolo B', count: 3 },
        { protocol: 'Protocolo C', count: 8 }
      ];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT p.name     AS protocol'),
        [123]
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        protocolCounts: mockStats
      } as TeacherStudentStats);
    });

    test('2. Debe manejar lista vacía de protocolos', async () => {
      const studentId = '124';
      const emptyStats: any[] = [];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: emptyStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        protocolCounts: emptyStats
      });
    });

    test('3. Debe convertir studentId string a número', async () => {
      const studentId = '999';
      const mockStats = [{ protocol: 'Test Protocol', count: 1 }];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [999] // Convertido a número
      );
    });

    test('4. Debe usar la query SQL correcta', async () => {
      const studentId = '125';
      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('SELECT p.name     AS protocol');
      expect(actualQuery).toContain('COUNT(*)    AS count');
      expect(actualQuery).toContain('FROM video_clip vc');
      expect(actualQuery).toContain('JOIN study s ON vc.study_id = s.id');
      expect(actualQuery).toContain('LEFT JOIN protocol p');
      expect(actualQuery).toContain('ON p.key = vc.protocol');
      expect(actualQuery).toContain('WHERE s.student_id = $1');
      expect(actualQuery).toContain('GROUP BY p.name');
      expect(actualQuery).toContain('ORDER BY p.name');
    });

    test('5. Debe manejar protocolos con nombres especiales', async () => {
      const studentId = '126';
      const mockStats = [
        { protocol: 'Protocolo con Espacios', count: 2 },
        { protocol: 'Protocolo-Con-Guiones', count: 4 },
        { protocol: 'Protocolo_Con_Guiones_Bajos', count: 1 }
      ];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        protocolCounts: mockStats
      });
    });

    test('6. Debe manejar counts altos correctamente', async () => {
      const studentId = '127';
      const mockStats = [
        { protocol: 'Protocolo Popular', count: 9999 },
        { protocol: 'Protocolo Medio', count: 500 }
      ];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        protocolCounts: mockStats
      });
    });

    test('7. Debe manejar protocolos con count 0', async () => {
      const studentId = '128';
      const mockStats = [
        { protocol: 'Protocolo Sin Uso', count: 0 }
      ];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        protocolCounts: mockStats
      });
    });

    test('8. Debe manejar protocolos null (LEFT JOIN)', async () => {
      const studentId = '129';
      const mockStats = [
        { protocol: null, count: 3 },
        { protocol: 'Protocolo Real', count: 5 }
      ];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        protocolCounts: mockStats
      });
    });
  });

  describe('Casos de error', () => {
    test('9. Debe pasar errores de base de datos al middleware', async () => {
      const studentId = '130';
      mockReq.params = { id: studentId };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('10. Debe manejar errores SQL específicos', async () => {
      const studentId = '131';
      mockReq.params = { id: studentId };

      const sqlError = new Error('SQL syntax error');
      mockPool.query.mockRejectedValueOnce(sqlError);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(sqlError);
    });

    test('11. Debe manejar timeout de base de datos', async () => {
      const studentId = '132';
      mockReq.params = { id: studentId };

      const timeoutError = new Error('Connection timeout');
      mockPool.query.mockRejectedValueOnce(timeoutError);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(timeoutError);
    });

    test('12. Debe manejar errores de permisos', async () => {
      const studentId = '133';
      mockReq.params = { id: studentId };

      const permissionError = new Error('Permission denied');
      mockPool.query.mockRejectedValueOnce(permissionError);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(permissionError);
    });
  });

  describe('Casos edge cases', () => {
    test('13. Debe manejar studentId no numérico', async () => {
      const studentId = 'invalid-id';
      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      // Number('invalid-id') retorna NaN
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [NaN]
      );
    });

    test('14. Debe manejar studentId con ceros al inicio', async () => {
      const studentId = '00134';
      const mockStats = [{ protocol: 'Test', count: 1 }];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [134] // Ceros ignorados
      );
    });

    test('15. Debe manejar studentId muy grande', async () => {
      const studentId = '999999999999';
      const mockStats = [{ protocol: 'Test', count: 1 }];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [999999999999]
      );
    });

    test('16. Debe manejar múltiples protocolos ordenados', async () => {
      const studentId = '135';
      const mockStats = [
        { protocol: 'A-Protocolo', count: 3 },
        { protocol: 'B-Protocolo', count: 1 },
        { protocol: 'Z-Protocolo', count: 5 }
      ];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        protocolCounts: mockStats
      });
    });
  });

  describe('Verificación de parámetros', () => {
    test('17. Debe usar solo studentId como parámetro', async () => {
      const studentId = '136';
      mockReq.params = { 
        id: studentId, 
        otherParam: 'should be ignored' 
      };
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [136] // Solo studentId
      );
    });

    test('18. Debe extraer studentId del parámetro id', async () => {
      const studentId = '137';
      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [137]
      );
    });
  });

  describe('Estructura de respuesta', () => {
    test('19. Debe retornar TeacherStudentStats interface', async () => {
      const studentId = '138';
      const mockStats = [
        { protocol: 'Protocolo 1', count: 2 },
        { protocol: 'Protocolo 2', count: 4 }
      ];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        protocolCounts: mockStats
      } as TeacherStudentStats);
    });

    test('20. Debe mantener la estructura exacta de TeacherStudentStats', async () => {
      const studentId = '139';
      const mockStats = [{ protocol: 'Test', count: 1 }];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      const responseCall = mockRes.json as jest.Mock;
      const responseData = responseCall.mock.calls[0][0];
      
      expect(responseData).toHaveProperty('protocolCounts');
      expect(Array.isArray(responseData.protocolCounts)).toBe(true);
      expect(responseData.protocolCounts).toEqual(mockStats);
    });

    test('21. No debe llamar a status en casos exitosos', async () => {
      const studentId = '140';
      const mockStats = [{ protocol: 'Test', count: 1 }];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Verificación de queries SQL complejas', () => {
    test('22. Debe incluir LEFT JOIN para manejar protocolos null', async () => {
      const studentId = '141';
      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('LEFT JOIN protocol p');
      expect(actualQuery).toContain('ON p.key = vc.protocol');
    });

    test('23. Debe incluir GROUP BY para agregación', async () => {
      const studentId = '142';
      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('GROUP BY p.name');
    });

    test('24. Debe incluir ORDER BY para ordenamiento', async () => {
      const studentId = '143';
      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('ORDER BY p.name');
    });
  });

  describe('Verificación de tipos de datos', () => {
    test('25. Debe manejar count como número', async () => {
      const studentId = '144';
      const mockStats = [
        { protocol: 'Test', count: 5 }
      ];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      const responseCall = mockRes.json as jest.Mock;
      const responseData = responseCall.mock.calls[0][0];
      
      expect(typeof responseData.protocolCounts[0].count).toBe('number');
    });

    test('26. Debe manejar protocol como string', async () => {
      const studentId = '145';
      const mockStats = [
        { protocol: 'Test Protocol', count: 3 }
      ];

      mockReq.params = { id: studentId };
      mockPool.query.mockResolvedValueOnce({ rows: mockStats } as any);

      await getStudentStats(mockReq as Request, mockRes as Response, mockNext);

      const responseCall = mockRes.json as jest.Mock;
      const responseData = responseCall.mock.calls[0][0];
      
      expect(typeof responseData.protocolCounts[0].protocol).toBe('string');
    });
  });
}); 