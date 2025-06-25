import { Request, Response } from 'express';
import { getTeacherStudents } from '../../../src/controllers/teacherController/getTeacherStudents';

// Mock de dependencias
jest.mock('../../../src/config/db');

const mockPool = {
  query: jest.fn()
};

// Mock console.error para los tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('getTeacherStudents', () => {
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

  it('debe obtener estudiantes del profesor exitosamente', async () => {
    const mockDbRows = [
      {
        id: 1,
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@test.com',
        studies: '3',
        average_score: '8.5',
        last_activity: '15 de Enero, 2024'
      },
      {
        id: 2,
        first_name: 'María',
        last_name: 'González',
        email: 'maria@test.com',
        studies: '2',
        average_score: '9.0',
        last_activity: '14 de Enero, 2024'
      }
    ];

    mockPool.query.mockResolvedValue({ rows: mockDbRows });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    expect(mockPool.query).toHaveBeenCalledTimes(1);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM users u'),
      [123]
    );

    const expectedResponse = {
      students: [
        {
          id: 1,
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan@test.com',
          studies: 3,
          average_score: 8.5,
          last_activity: '15 de Enero, 2024'
        },
        {
          id: 2,
          first_name: 'María',
          last_name: 'González',
          email: 'maria@test.com',
          studies: 2,
          average_score: 9.0,
          last_activity: '14 de Enero, 2024'
        }
      ]
    };

    expect(mockRes.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('debe usar teacherId del parámetro correctamente', async () => {
    mockReq.params!.teacherId = '456';
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      [456]
    );
  });

  it('debe incluir JOINs correctos en la consulta', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('LEFT JOIN study s');
    expect(query).toContain('LEFT JOIN evaluation_form ef');
    expect(query).toContain('ON s.student_id = u.id');
    expect(query).toContain('ON ef.study_id = s.id');
  });

  it('debe filtrar por role estudiante', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain("WHERE u.role = 'estudiante'");
  });

  it('debe filtrar por teacher_id y score NOT NULL', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('AND ef.teacher_id = $1');
    expect(query).toContain('AND ef.score IS NOT NULL');
  });

  it('debe incluir GROUP BY correcto', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('GROUP BY u.id, u.first_name, u.last_name, u.email');
  });

  it('debe ordenar por last_name y first_name', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('ORDER BY u.last_name, u.first_name');
  });

  it('debe incluir funciones de agregación correctas', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('COUNT(s.id)');
    expect(query).toContain('ROUND(AVG(ef.score)::numeric, 1)');
    expect(query).toContain('MAX(s.created_at)');
  });

  it('debe formatear fecha con TO_CHAR', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('TO_CHAR(MAX(s.created_at), \'DD "de" FMMonth, YYYY\')');
  });

  it('debe manejar valores nulos en average_score', async () => {
    const mockDbRows = [
      {
        id: 1,
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@test.com',
        studies: '1',
        average_score: null,
        last_activity: null
      }
    ];

    mockPool.query.mockResolvedValue({ rows: mockDbRows });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    const expectedResponse = {
      students: [
        {
          id: 1,
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan@test.com',
          studies: 1,
          average_score: 0,
          last_activity: ''
        }
      ]
    };

    expect(mockRes.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('debe convertir tipos de datos correctamente', async () => {
    const mockDbRows = [
      {
        id: 1,
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@test.com',
        studies: '5',
        average_score: '7.8',
        last_activity: '20 de Enero, 2024'
      }
    ];

    mockPool.query.mockResolvedValue({ rows: mockDbRows });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    const response = (mockRes.json as jest.Mock).mock.calls[0][0];
    const student = response.students[0];

    expect(typeof student.studies).toBe('number');
    expect(typeof student.average_score).toBe('number');
    expect(student.studies).toBe(5);
    expect(student.average_score).toBe(7.8);
  });

  it('debe retornar array vacío cuando no hay estudiantes', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith({ students: [] });
  });

  it('debe manejar errores de base de datos', async () => {
    const error = new Error('Database connection failed');
    mockPool.query.mockRejectedValue(error);

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    expect(mockConsoleError).toHaveBeenCalledWith('Error fetching teacher students:', error);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ msg: 'Error fetching students' });
  });

  it('debe manejar errores SQL específicos', async () => {
    const sqlError = new Error('relation "users" does not exist');
    sqlError.name = 'DatabaseError';
    mockPool.query.mockRejectedValue(sqlError);

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    expect(mockConsoleError).toHaveBeenCalledWith('Error fetching teacher students:', sqlError);
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('debe manejar timeout de consulta', async () => {
    const timeoutError = new Error('Query timeout exceeded');
    timeoutError.name = 'TimeoutError';
    mockPool.query.mockRejectedValue(timeoutError);

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    expect(mockConsoleError).toHaveBeenCalledWith('Error fetching teacher students:', timeoutError);
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('debe convertir teacherId a número correctamente', async () => {
    mockReq.params!.teacherId = '789';
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      [789]
    );
  });

  it('debe manejar casos edge de teacherId', async () => {
    mockReq.params!.teacherId = '0';
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      [0]
    );
  });

  it('debe procesar múltiples estudiantes correctamente', async () => {
    const mockDbRows = [
      {
        id: 1,
        first_name: 'Ana',
        last_name: 'García',
        email: 'ana@test.com',
        studies: '4',
        average_score: '8.2',
        last_activity: '22 de Enero, 2024'
      },
      {
        id: 2,
        first_name: 'Carlos',
        last_name: 'López',
        email: 'carlos@test.com',
        studies: '3',
        average_score: '7.5',
        last_activity: '21 de Enero, 2024'
      },
      {
        id: 3,
        first_name: 'Diana',
        last_name: 'Martín',
        email: 'diana@test.com',
        studies: '2',
        average_score: '9.1',
        last_activity: '20 de Enero, 2024'
      }
    ];

    mockPool.query.mockResolvedValue({ rows: mockDbRows });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    const response = (mockRes.json as jest.Mock).mock.calls[0][0];
    expect(response.students).toHaveLength(3);
    expect(response.students.every((s: any) => typeof s.id === 'number')).toBe(true);
    expect(response.students.every((s: any) => typeof s.studies === 'number')).toBe(true);
    expect(response.students.every((s: any) => typeof s.average_score === 'number')).toBe(true);
  });

  it('debe manejar errores de foreign key', async () => {
    const fkError = new Error('Foreign key constraint violation');
    fkError.name = 'ForeignKeyError';
    mockPool.query.mockRejectedValue(fkError);

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    expect(mockConsoleError).toHaveBeenCalledWith('Error fetching teacher students:', fkError);
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('debe incluir todos los campos requeridos en SELECT', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherStudents(mockReq as Request, mockRes as Response);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('u.id');
    expect(query).toContain('u.first_name');
    expect(query).toContain('u.last_name');
    expect(query).toContain('u.email');
    expect(query).toContain('COUNT(s.id)                                  AS studies');
    expect(query).toContain('ROUND(AVG(ef.score)::numeric, 1)             AS average_score');
  });
}); 