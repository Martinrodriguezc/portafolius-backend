import { Request, Response } from 'express';

// Mock de módulos ANTES de importar
jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// Mock de console.error
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

import { getTeacherStats } from '../../../src/controllers/teacherController/getTeacherStats';
import { pool } from '../../../src/config/db';

// Referencias a los mocks
const mockPool = pool as jest.Mocked<typeof pool>;

describe('GetTeacherStats Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Reset de todos los mocks
    jest.clearAllMocks();
    mockConsoleError.mockClear();

    // Setup del request
    mockReq = {
      params: {},
    };

    // Setup del response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Casos exitosos', () => {
    test('1. Debe obtener estadísticas del profesor exitosamente', async () => {
      const teacherId = '123';
      mockReq.params = { teacherId };

      // Mock de las 3 queries
      const mockPendingResult = {
        rows: [{ count: '5' }],
        rowCount: 1,
      };
      const mockEvaluatedResult = {
        rows: [{ count: '3' }],
        rowCount: 1,
      };
      const mockStudentResult = {
        rows: [{ count: '25' }],
        rowCount: 1,
      };

      mockPool.query
        .mockResolvedValueOnce(mockPendingResult)
        .mockResolvedValueOnce(mockEvaluatedResult)
        .mockResolvedValueOnce(mockStudentResult);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      // Verificar las 3 queries
      expect(mockPool.query).toHaveBeenCalledTimes(3);
      
      // Query 1: Evaluaciones pendientes
      expect(mockPool.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('COUNT(*) AS count'),
        [123]
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('ef.score IS NULL'),
        [123]
      );

      // Query 2: Evaluaciones de hoy
      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('CURRENT_DATE'),
        [123]
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('ef.score IS NOT NULL'),
        [123]
      );

      // Query 3: Total estudiantes
      expect(mockPool.query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('role = \'estudiante\'')
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        pendingCount: 5,
        evaluatedToday: 3,
        studentCount: 25,
      });
    });

    test('2. Debe manejar contadores en cero', async () => {
      const teacherId = '456';
      mockReq.params = { teacherId };

      // Mock con todos los contadores en cero
      const mockZeroResult = {
        rows: [{ count: '0' }],
        rowCount: 1,
      };

      mockPool.query
        .mockResolvedValue(mockZeroResult);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        pendingCount: 0,
        evaluatedToday: 0,
        studentCount: 0,
      });
    });

    test('3. Debe manejar contadores con valores altos', async () => {
      const teacherId = '789';
      mockReq.params = { teacherId };

      const mockHighResults = [
        { rows: [{ count: '150' }], rowCount: 1 },
        { rows: [{ count: '75' }], rowCount: 1 },
        { rows: [{ count: '1000' }], rowCount: 1 }
      ];

      mockPool.query
        .mockResolvedValueOnce(mockHighResults[0])
        .mockResolvedValueOnce(mockHighResults[1])
        .mockResolvedValueOnce(mockHighResults[2]);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        pendingCount: 150,
        evaluatedToday: 75,
        studentCount: 1000,
      });
    });

    test('4. Debe convertir teacherId string a number correctamente', async () => {
      const teacherId = '999';
      mockReq.params = { teacherId };

      const mockResult = {
        rows: [{ count: '1' }],
        rowCount: 1,
      };

      mockPool.query.mockResolvedValue(mockResult);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      // Verificar que se convirtió a número
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [999] // Como número, no string
      );
    });
  });

  describe('Casos con datos faltantes o null', () => {
    test('5. Debe manejar rows vacío con fallback a "0"', async () => {
      const teacherId = '111';
      mockReq.params = { teacherId };

      // Mock con rows vacío
      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
      };

      mockPool.query.mockResolvedValue(mockEmptyResult);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        pendingCount: 0,
        evaluatedToday: 0,
        studentCount: 0,
      });
    });

    test('6. Debe manejar count null con fallback a "0"', async () => {
      const teacherId = '222';
      mockReq.params = { teacherId };

      // Mock con count null
      const mockNullResult = {
        rows: [{ count: null }],
        rowCount: 1,
      };

      mockPool.query.mockResolvedValue(mockNullResult);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        pendingCount: 0,
        evaluatedToday: 0,
        studentCount: 0,
      });
    });

    test('7. Debe manejar count undefined con fallback a "0"', async () => {
      const teacherId = '333';
      mockReq.params = { teacherId };

      // Mock con count undefined
      const mockUndefinedResult = {
        rows: [{ count: undefined }],
        rowCount: 1,
      };

      mockPool.query.mockResolvedValue(mockUndefinedResult);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        pendingCount: 0,
        evaluatedToday: 0,
        studentCount: 0,
      });
    });

    test('8. Debe manejar combinación de resultados válidos y nulos', async () => {
      const teacherId = '444';
      mockReq.params = { teacherId };

      // Mock con resultados mixtos
      const mockPendingResult = {
        rows: [{ count: '10' }],
        rowCount: 1,
      };
      const mockEvaluatedResult = {
        rows: [],
        rowCount: 0,
      };
      const mockStudentResult = {
        rows: [{ count: null }],
        rowCount: 1,
      };

      mockPool.query
        .mockResolvedValueOnce(mockPendingResult)
        .mockResolvedValueOnce(mockEvaluatedResult)
        .mockResolvedValueOnce(mockStudentResult);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        pendingCount: 10,    // válido
        evaluatedToday: 0,   // rows vacío
        studentCount: 0,     // count null
      });
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('9. Debe manejar error en primera query (pending)', async () => {
      const teacherId = '555';
      mockReq.params = { teacherId };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(dbError);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error fetching teacher stats'
      });
    });

    test('10. Debe manejar error en segunda query (evaluated)', async () => {
      const teacherId = '666';
      mockReq.params = { teacherId };

      const mockPendingResult = {
        rows: [{ count: '5' }],
        rowCount: 1,
      };
      const evaluatedError = new Error('Query timeout on evaluated');

      mockPool.query
        .mockResolvedValueOnce(mockPendingResult)
        .mockRejectedValueOnce(evaluatedError);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error fetching teacher stats'
      });
    });

    test('11. Debe manejar error en tercera query (students)', async () => {
      const teacherId = '777';
      mockReq.params = { teacherId };

      const mockPendingResult = {
        rows: [{ count: '5' }],
        rowCount: 1,
      };
      const mockEvaluatedResult = {
        rows: [{ count: '3' }],
        rowCount: 1,
      };
      const studentError = new Error('Student count query failed');

      mockPool.query
        .mockResolvedValueOnce(mockPendingResult)
        .mockResolvedValueOnce(mockEvaluatedResult)
        .mockRejectedValueOnce(studentError);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error fetching teacher stats'
      });
    });

    test('12. Debe manejar diferentes tipos de errores de DB', async () => {
      const teacherId = '888';
      mockReq.params = { teacherId };

      const constraintError = new Error('Foreign key constraint violation');
      mockPool.query.mockRejectedValue(constraintError);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error fetching teacher stats'
      });
    });
  });

  describe('Validación de queries SQL', () => {
    test('13. Debe usar las queries SQL correctas', async () => {
      const teacherId = '100';
      mockReq.params = { teacherId };

      const mockResult = {
        rows: [{ count: '1' }],
        rowCount: 1,
      };

      mockPool.query.mockResolvedValue(mockResult);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      // Verificar estructura de las queries
      const queries = mockPool.query.mock.calls;

      // Query 1: Pending evaluations
      expect(queries[0][0]).toContain('evaluation_form ef');
      expect(queries[0][0]).toContain('ef.teacher_id = $1');
      expect(queries[0][0]).toContain('ef.score IS NULL');

      // Query 2: Today's evaluations
      expect(queries[1][0]).toContain('evaluation_form ef');
      expect(queries[1][0]).toContain('ef.teacher_id = $1');
      expect(queries[1][0]).toContain('CURRENT_DATE');
      expect(queries[1][0]).toContain('ef.score IS NOT NULL');

      // Query 3: Student count
      expect(queries[2][0]).toContain('users u');
      expect(queries[2][0]).toContain('role = \'estudiante\'');
    });

    test('14. Debe usar parámetros correctos en las queries', async () => {
      const teacherId = '200';
      mockReq.params = { teacherId };

      const mockResult = {
        rows: [{ count: '1' }],
        rowCount: 1,
      };

      mockPool.query.mockResolvedValue(mockResult);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      // Las primeras dos queries deben usar teacherId
      expect(mockPool.query).toHaveBeenNthCalledWith(1,
        expect.any(String),
        [200]
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        expect.any(String),
        [200]
      );

      // La tercera query no debe usar parámetros (o undefined)
      expect(mockPool.query).toHaveBeenNthCalledWith(3,
        expect.any(String)
      );
    });
  });

  describe('Estructura de respuesta', () => {
    test('15. Debe retornar estructura correcta con números', async () => {
      const teacherId = '300';
      mockReq.params = { teacherId };

      const mockResult = {
        rows: [{ count: '7' }],
        rowCount: 1,
      };

      mockPool.query.mockResolvedValue(mockResult);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingCount: expect.any(Number),
          evaluatedToday: expect.any(Number),
          studentCount: expect.any(Number),
        })
      );

      // Verificar que son números, no strings
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(typeof response.pendingCount).toBe('number');
      expect(typeof response.evaluatedToday).toBe('number');
      expect(typeof response.studentCount).toBe('number');
    });

    test('16. Debe retornar estructura correcta para error 500', async () => {
      const teacherId = '400';
      mockReq.params = { teacherId };

      const dbError = new Error('Database error');
      mockPool.query.mockRejectedValue(dbError);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.any(String),
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error fetching teacher stats'
      });
    });
  });

  describe('Flujo de ejecución', () => {
    test('17. Debe ejecutar todas las queries antes de retornar respuesta', async () => {
      const teacherId = '500';
      mockReq.params = { teacherId };

      const mockResult = {
        rows: [{ count: '2' }],
        rowCount: 1,
      };

      mockPool.query.mockResolvedValue(mockResult);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      // Debe ejecutar exactamente 3 queries
      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockRes.json).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled(); // No error
    });

    test('18. Debe convertir teacherId una sola vez', async () => {
      const teacherId = '600';
      mockReq.params = { teacherId };

      const mockResult = {
        rows: [{ count: '1' }],
        rowCount: 1,
      };

      mockPool.query.mockResolvedValue(mockResult);

      await getTeacherStats(mockReq as Request, mockRes as Response);

      // Verificar que todas las queries usan el mismo teacherId convertido
      const queries = mockPool.query.mock.calls;
      expect(queries[0][1]).toEqual([600]); // Primera query
      expect(queries[1][1]).toEqual([600]); // Segunda query
      // Tercera query no usa teacherId
    });
  });
}); 