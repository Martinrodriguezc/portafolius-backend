import { Request, Response, NextFunction } from 'express';
import { getTeacherProtocolStats, ProtocolCount } from '../../../src/controllers/teacherController/getTeacherProtocolStats';

// Mock de dependencias
jest.mock('../../../src/config/db');

const mockPool = {
  query: jest.fn()
};

describe('getTeacherProtocolStats', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

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

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe obtener estadísticas de protocolo exitosamente', async () => {
    const mockRows: ProtocolCount[] = [
      { protocol: 'SSI', count: 5 },
      { protocol: 'RTI', count: 3 },
      { protocol: 'TEACCH', count: 2 }
    ];

    mockPool.query.mockResolvedValue({ rows: mockRows });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    expect(mockPool.query).toHaveBeenCalledTimes(1);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM video_clip vc'),
      [123]
    );
    expect(mockRes.json).toHaveBeenCalledWith({ protocolCounts: mockRows });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debe usar teacherId del parámetro correctamente', async () => {
    mockReq.params!.teacherId = '456';
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      [456]
    );
  });

  it('debe incluir JOINs correctos en la consulta', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('JOIN study s');
    expect(query).toContain('JOIN evaluation_form e');
    expect(query).toContain('LEFT JOIN protocol p');
  });

  it('debe usar las columnas correctas en SELECT', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('p.name       AS protocol');
    expect(query).toContain('COUNT(*)      AS count');
  });

  it('debe filtrar por teacher_id correctamente', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('WHERE s.teacher_id = $1');
  });

  it('debe agrupar y ordenar por protocolo', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('GROUP BY p.name');
    expect(query).toContain('ORDER BY p.name');
  });

  it('debe retornar array vacío cuando no hay estadísticas', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ protocolCounts: [] });
  });

  it('debe convertir teacherId a número correctamente', async () => {
    mockReq.params!.teacherId = '789';
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      [789]
    );
  });

  it('debe manejar errores usando next()', async () => {
    const error = new Error('Database connection failed');
    mockPool.query.mockRejectedValue(error);

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(error);
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('debe manejar errores SQL específicos', async () => {
    const sqlError = new Error('relation "protocol" does not exist');
    sqlError.name = 'DatabaseError';
    mockPool.query.mockRejectedValue(sqlError);

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(sqlError);
  });

  it('debe manejar timeout de consulta', async () => {
    const timeoutError = new Error('Query timeout');
    timeoutError.name = 'TimeoutError';
    mockPool.query.mockRejectedValue(timeoutError);

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(timeoutError);
  });

  it('debe procesar múltiples protocolos correctamente', async () => {
    const mockRows: ProtocolCount[] = [
      { protocol: 'ABA', count: 8 },
      { protocol: 'PECS', count: 4 },
      { protocol: 'PROMPT', count: 6 },
      { protocol: 'RTI', count: 3 },
      { protocol: 'SSI', count: 10 }
    ];

    mockPool.query.mockResolvedValue({ rows: mockRows });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ 
      protocolCounts: expect.arrayContaining([
        expect.objectContaining({ protocol: 'ABA', count: 8 }),
        expect.objectContaining({ protocol: 'SSI', count: 10 })
      ])
    });
  });

  it('debe manejar parámetros edge case de teacherId', async () => {
    mockReq.params!.teacherId = '0';
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      [0]
    );
  });

  it('debe usar TypeScript types correctamente', async () => {
    const mockRows: ProtocolCount[] = [
      { protocol: 'Test Protocol', count: 1 }
    ];

    mockPool.query.mockResolvedValue({ rows: mockRows });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array)
    );
    
    const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall).toHaveProperty('protocolCounts');
    expect(Array.isArray(jsonCall.protocolCounts)).toBe(true);
  });

  it('debe incluir la relación con video_clip correctamente', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    const query = mockPool.query.mock.calls[0][0];
    expect(query).toContain('FROM video_clip vc');
    expect(query).toContain('ON vc.study_id = s.id');
    expect(query).toContain('ON e.study_id    = s.id');
    expect(query).toContain('ON p.key         = vc.protocol');
  });

  it('debe manejar protocolos nulos o indefinidos', async () => {
    const mockRows: ProtocolCount[] = [
      { protocol: 'SSI', count: 5 },
      { protocol: null as any, count: 2 }
    ];

    mockPool.query.mockResolvedValue({ rows: mockRows });

    await getTeacherProtocolStats(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ protocolCounts: mockRows });
  });
}); 