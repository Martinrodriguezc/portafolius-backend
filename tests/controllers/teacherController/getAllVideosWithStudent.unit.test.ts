import { Request, Response } from 'express';
import { getAllVideosWithStudent } from '../../../src/controllers/teacherController/getAllVideosWithStudent';

// Mock de dependencias
jest.mock('../../../src/config/db');
jest.mock('../../../src/config/logger');

const mockPool = {
  query: jest.fn()
};

const mockLogger = {
  error: jest.fn()
};

describe('getAllVideosWithStudent', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock del pool y logger
    require('../../../src/config/db').pool = mockPool;
    require('../../../src/config/logger').default = mockLogger;

    mockReq = {};

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe obtener estudios con información de estudiantes exitosamente', async () => {
    const mockRows = [
      {
        student_name: 'Juan Pérez',
        study: {
          id: 1,
          student_id: 10,
          title: 'Estudio SSI Protocolo 1',
          protocol: 'SSI',
          created_at: '2024-01-15T10:30:00Z',
          teacher_id: 5
        }
      },
      {
        student_name: 'María González',
        study: {
          id: 2,
          student_id: 11,
          title: 'Estudio RTI Avanzado',
          protocol: 'RTI',
          created_at: '2024-01-14T09:15:00Z',
          teacher_id: 5
        }
      }
    ];

    mockPool.query.mockResolvedValue({ rows: mockRows });

    await getAllVideosWithStudent(mockReq as Request, mockRes as Response);

    expect(mockPool.query).toHaveBeenCalledTimes(1);
    expect(mockRes.json).toHaveBeenCalledWith({ studies: mockRows });
  });

  it('debe usar SELECT con CONCAT para student_name', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getAllVideosWithStudent(mockReq as Request, mockRes as Response);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain("(u.first_name || ' ' || u.last_name) AS student_name");
  });

  it('debe usar row_to_json para study', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getAllVideosWithStudent(mockReq as Request, mockRes as Response);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('row_to_json(s) AS study');
  });

  it('debe incluir JOIN correcto entre study y users', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getAllVideosWithStudent(mockReq as Request, mockRes as Response);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('FROM study AS s');
    expect(query).toContain('JOIN users AS u');
    expect(query).toContain('ON u.id = s.student_id');
  });

  it('debe ordenar por created_at DESC', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getAllVideosWithStudent(mockReq as Request, mockRes as Response);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('ORDER BY s.created_at DESC');
  });

  it('debe retornar array vacío cuando no hay estudios', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getAllVideosWithStudent(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith({ studies: [] });
  });

  it('debe manejar errores de base de datos', async () => {
    const error = new Error('Database connection failed');
    mockPool.query.mockRejectedValue(error);

    await getAllVideosWithStudent(mockReq as Request, mockRes as Response);

    expect(mockLogger.error).toHaveBeenCalledWith('Error al obtener videos con alumno:', error);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ msg: 'Error al obtener los videos' });
  });

  it('debe ejecutar consulta sin parámetros', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getAllVideosWithStudent(mockReq as Request, mockRes as Response);

    expect(mockPool.query).toHaveBeenCalledWith(expect.any(String));
    expect(mockPool.query).toHaveBeenCalledTimes(1);
    // Verificar que no se pasaron parámetros adicionales
    expect(mockPool.query.mock.calls[0]).toHaveLength(1);
  });
}); 