import { Request, Response } from 'express';
import { getPendingEvaluations, getCompletedEvaluations } from '../../../src/controllers/teacherController/getTeacherEvaluations';

// Mock de dependencias
jest.mock('../../../src/config/db');
jest.mock('../../../src/config/logger');

const mockPool = {
  query: jest.fn()
};

// Mock console.error para los tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('getTeacherEvaluations', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock del pool
    require('../../../src/config/db').pool = mockPool;

    mockReq = {
      params: { teacherId: '123' }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPendingEvaluations', () => {
    it('debe obtener evaluaciones pendientes exitosamente', async () => {
      const mockRows = [
        {
          id: 1,
          student_id: 1,
          student: 'Juan Pérez',
          protocol: 'SSI',
          videos: 3,
          tags: ['tag1', 'tag2'],
          date: '15 de Enero, 2024'
        },
        {
          id: 2,
          student_id: 2,
          student: 'María González',
          protocol: 'RTI',
          videos: 2,
          tags: ['tag3'],
          date: '14 de Enero, 2024'
        }
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      await getPendingEvaluations(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM evaluation_form ef'),
        [123]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ef.score IS NULL'),
        [123]
      );
      expect(mockRes.json).toHaveBeenCalledWith({ pending: mockRows });
    });

    it('debe usar teacherId del parámetro de ruta correctamente', async () => {
      mockReq.params!.teacherId = '456';
      mockPool.query.mockResolvedValue({ rows: [] });

      await getPendingEvaluations(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [456]
      );
    });

    it('debe incluir JOINs correctos en la consulta', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getPendingEvaluations(mockReq as Request, mockRes as Response);

      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('JOIN study s');
      expect(query).toContain('JOIN users u');
      expect(query).toContain('LEFT JOIN clip_tag ct');
      expect(query).toContain('LEFT JOIN tag t');
    });

    it('debe ordenar por submitted_at DESC', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getPendingEvaluations(mockReq as Request, mockRes as Response);

      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('ORDER BY ef.submitted_at DESC');
    });

    it('debe agrupar por campos correctos', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getPendingEvaluations(mockReq as Request, mockRes as Response);

      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('GROUP BY');
      expect(query).toContain('ef.id');
      expect(query).toContain('s.student_id');
      expect(query).toContain('u.first_name');
      expect(query).toContain('u.last_name');
    });

    it('debe retornar array vacío cuando no hay evaluaciones pendientes', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getPendingEvaluations(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({ pending: [] });
    });

    it('debe manejar errores de base de datos', async () => {
      const error = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(error);

      await getPendingEvaluations(mockReq as Request, mockRes as Response);

      expect(mockConsoleError).toHaveBeenCalledWith('Error fetching pending evaluations:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ msg: 'Error fetching pending evaluations' });
    });

    it('debe manejar errores SQL específicos', async () => {
      const sqlError = new Error('ECONNREFUSED');
      sqlError.name = 'DatabaseError';
      mockPool.query.mockRejectedValue(sqlError);

      await getPendingEvaluations(mockReq as Request, mockRes as Response);

      expect(mockConsoleError).toHaveBeenCalledWith('Error fetching pending evaluations:', sqlError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('debe convertir teacherId a número correctamente', async () => {
      mockReq.params!.teacherId = '789';
      mockPool.query.mockResolvedValue({ rows: [] });

      await getPendingEvaluations(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [789]
      );
    });

    it('debe incluir el filtro de teacher_id en WHERE', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getPendingEvaluations(mockReq as Request, mockRes as Response);

      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('WHERE ef.teacher_id = $1');
      expect(query).toContain('AND ef.score IS NULL');
    });
  });

  describe('getCompletedEvaluations', () => {
    it('debe obtener evaluaciones completadas exitosamente', async () => {
      const mockRows = [
        {
          id: 1,
          student_id: 1,
          student: 'Juan Pérez',
          protocol: 'SSI',
          videos: 3,
          tags: ['tag1', 'tag2'],
          score: 8,
          date: '15 de Enero, 2024'
        },
        {
          id: 2,
          student_id: 2,
          student: 'María González',
          protocol: 'RTI',
          videos: 2,
          tags: ['tag3'],
          score: 9,
          date: '14 de Enero, 2024'
        }
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      await getCompletedEvaluations(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM evaluation_form ef'),
        [123]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ef.score IS NOT NULL'),
        [123]
      );
      expect(mockRes.json).toHaveBeenCalledWith({ completed: mockRows });
    });

    it('debe incluir el campo score en la consulta', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getCompletedEvaluations(mockReq as Request, mockRes as Response);

      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('ef.score');
      expect(query).toContain('ef.score IS NOT NULL');
    });

    it('debe usar teacherId del parámetro correctamente', async () => {
      mockReq.params!.teacherId = '999';
      mockPool.query.mockResolvedValue({ rows: [] });

      await getCompletedEvaluations(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [999]
      );
    });

    it('debe incluir todos los JOINs necesarios', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getCompletedEvaluations(mockReq as Request, mockRes as Response);

      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('JOIN study s');
      expect(query).toContain('JOIN users u');
      expect(query).toContain('LEFT JOIN clip_tag ct');
      expect(query).toContain('LEFT JOIN tag t');
    });

    it('debe ordenar por submitted_at DESC', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getCompletedEvaluations(mockReq as Request, mockRes as Response);

      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('ORDER BY ef.submitted_at DESC');
    });

    it('debe agrupar por campos que incluyen score', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getCompletedEvaluations(mockReq as Request, mockRes as Response);

      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('GROUP BY');
      expect(query).toContain('ef.score');
    });

    it('debe retornar array vacío cuando no hay evaluaciones completadas', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getCompletedEvaluations(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({ completed: [] });
    });

    it('debe manejar errores de base de datos', async () => {
      const error = new Error('Database query timeout');
      mockPool.query.mockRejectedValue(error);

      await getCompletedEvaluations(mockReq as Request, mockRes as Response);

      expect(mockConsoleError).toHaveBeenCalledWith('Error fetching completed evaluations:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ msg: 'Error fetching completed evaluations' });
    });

    it('debe manejar errores de conexión específicos', async () => {
      const connectionError = new Error('Connection lost');
      connectionError.name = 'ConnectionError';
      mockPool.query.mockRejectedValue(connectionError);

      await getCompletedEvaluations(mockReq as Request, mockRes as Response);

      expect(mockConsoleError).toHaveBeenCalledWith('Error fetching completed evaluations:', connectionError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('debe manejar parámetros de teacherId edge cases', async () => {
      mockReq.params!.teacherId = '0';
      mockPool.query.mockResolvedValue({ rows: [] });

      await getCompletedEvaluations(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [0]
      );
    });

    it('debe filtrar correctamente por teacher_id y score NOT NULL', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getCompletedEvaluations(mockReq as Request, mockRes as Response);

      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('WHERE ef.teacher_id = $1');
      expect(query).toContain('AND ef.score IS NOT NULL');
    });
  });
}); 