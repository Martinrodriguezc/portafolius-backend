import { Request, Response, NextFunction } from 'express';
import { getAllProtocols, createProtocol } from '../../../src/controllers/protocolController/protocolController';
import { pool } from '../../../src/config/db';
import { createUniqueTestData } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');

const mockPool = pool as jest.Mocked<typeof pool>;

describe('ProtocolController - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let testData: ReturnType<typeof createUniqueTestData>;

  beforeEach(() => {
    testData = createUniqueTestData();
    
    mockReq = {
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getAllProtocols', () => {
    describe('Casos exitosos', () => {
      test('1. Debe obtener todos los protocolos exitosamente', async () => {
        const mockProtocols = [
          { id: 1, key: 'protocol1', name: `Protocol 1 ${testData.timestamp}` },
          { id: 2, key: 'protocol2', name: `Protocol 2 ${testData.timestamp}` },
          { id: 3, key: 'protocol3', name: `Protocol 3 ${testData.timestamp}` }
        ];

        mockPool.query.mockResolvedValueOnce({
          rows: mockProtocols
        } as any);

        await getAllProtocols(mockReq as Request, mockRes as Response, mockNext);

        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id, key, name FROM protocol ORDER BY name'
        );
        expect(mockRes.json).toHaveBeenCalledWith(mockProtocols);
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('2. Debe manejar lista vacía de protocolos', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: []
        } as any);

        await getAllProtocols(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith([]);
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('3. Debe ordenar por nombre', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: []
        } as any);

        await getAllProtocols(mockReq as Request, mockRes as Response, mockNext);

        const query = mockPool.query.mock.calls[0][0] as string;
        expect(query).toContain('ORDER BY name');
      });

      test('4. Debe incluir todos los campos requeridos', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: []
        } as any);

        await getAllProtocols(mockReq as Request, mockRes as Response, mockNext);

        const query = mockPool.query.mock.calls[0][0] as string;
        expect(query).toContain('SELECT id, key, name');
        expect(query).toContain('FROM protocol');
      });
    });

    describe('Casos de error', () => {
      test('5. Debe manejar errores de base de datos', async () => {
        const dbError = new Error('Database connection failed');
        mockPool.query.mockRejectedValueOnce(dbError);

        await getAllProtocols(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(dbError);
        expect(mockRes.json).not.toHaveBeenCalled();
      });

      test('6. Debe manejar errores SQL específicos', async () => {
        const sqlError = new Error('SQL syntax error');
        mockPool.query.mockRejectedValueOnce(sqlError);

        await getAllProtocols(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(sqlError);
      });
    });
  });

  describe('createProtocol', () => {
    describe('Casos exitosos', () => {
      test('7. Debe crear protocolo exitosamente', async () => {
        const protocolName = `Test Protocol ${testData.timestamp}`;
        mockReq.body = { name: protocolName };

        const mockCreatedProtocol = {
          id: 123,
          key: 'test_protocol_' + testData.timestamp,
          name: protocolName
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockCreatedProtocol]
        } as any);

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        expect(mockPool.query).toHaveBeenCalledWith(
          'INSERT INTO protocol(key, name) VALUES($1, $2) RETURNING id, key, name',
          [expect.any(String), protocolName]
        );
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(mockCreatedProtocol);
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('8. Debe generar key correctamente desde el nombre', async () => {
        const protocolName = 'Test Protocol With Spaces';
        mockReq.body = { name: protocolName };

        const mockCreatedProtocol = {
          id: 124,
          key: 'test_protocol_with_spaces',
          name: protocolName
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockCreatedProtocol]
        } as any);

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        const query = mockPool.query.mock.calls[0];
        const generatedKey = query[1][0] as string;
        expect(generatedKey).toBe('test_protocol_with_spaces');
      });

      test('9. Debe manejar caracteres especiales en el nombre', async () => {
        const protocolName = 'Protocolo con áéíóú & símbolos!';
        mockReq.body = { name: protocolName };

        const mockCreatedProtocol = {
          id: 125,
          key: 'protocolo_con_aeiou_simbolos',
          name: protocolName
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockCreatedProtocol]
        } as any);

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        const query = mockPool.query.mock.calls[0];
        const generatedKey = query[1][0] as string;
        // Verificar que los caracteres especiales se normalizaron
        expect(generatedKey).not.toContain('á');
        expect(generatedKey).not.toContain('!');
        expect(generatedKey).not.toContain('&');
        expect(generatedKey).toMatch(/^[a-z0-9_]+$/);
      });

      test('10. Debe remover espacios al inicio y final', async () => {
        const protocolName = '  Spaced Protocol  ';
        mockReq.body = { name: protocolName };

        const mockCreatedProtocol = {
          id: 126,
          key: 'spaced_protocol',
          name: 'Spaced Protocol'
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockCreatedProtocol]
        } as any);

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        const query = mockPool.query.mock.calls[0];
        const trimmedName = query[1][1] as string;
        expect(trimmedName).toBe('Spaced Protocol');
      });
    });

    describe('Casos de error - Validación', () => {
      test('11. Debe retornar 400 cuando name es undefined', async () => {
        mockReq.body = {};

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'El nombre del protocolo es requerido'
        });
        expect(mockPool.query).not.toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('12. Debe retornar 400 cuando name es null', async () => {
        mockReq.body = { name: null };

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'El nombre del protocolo es requerido'
        });
        expect(mockPool.query).not.toHaveBeenCalled();
      });

      test('13. Debe retornar 400 cuando name es string vacío', async () => {
        mockReq.body = { name: '' };

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'El nombre del protocolo es requerido'
        });
        expect(mockPool.query).not.toHaveBeenCalled();
      });

      test('14. Debe retornar 400 cuando name es solo espacios', async () => {
        mockReq.body = { name: '   ' };

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'El nombre del protocolo es requerido'
        });
        expect(mockPool.query).not.toHaveBeenCalled();
      });

      test('15. Debe retornar 400 cuando name no es string', async () => {
        mockReq.body = { name: 123 };

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'El nombre del protocolo es requerido'
        });
        expect(mockPool.query).not.toHaveBeenCalled();
      });

      test('16. Debe retornar 400 cuando name es array', async () => {
        mockReq.body = { name: ['protocol', 'name'] };

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'El nombre del protocolo es requerido'
        });
        expect(mockPool.query).not.toHaveBeenCalled();
      });
    });

    describe('Casos de error - Base de datos', () => {
      test('17. Debe retornar 409 para protocolo duplicado', async () => {
        const protocolName = 'Duplicate Protocol';
        mockReq.body = { name: protocolName };

        const duplicateError = new Error('Duplicate key violation');
        (duplicateError as any).code = '23505';
        mockPool.query.mockRejectedValueOnce(duplicateError);

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(409);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Protocolo ya existe'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('18. Debe manejar errores de base de datos genéricos', async () => {
        const protocolName = 'Error Protocol';
        mockReq.body = { name: protocolName };

        const dbError = new Error('Database connection failed');
        mockPool.query.mockRejectedValueOnce(dbError);

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(dbError);
        expect(mockRes.status).not.toHaveBeenCalledWith(409);
        expect(mockRes.json).not.toHaveBeenCalledWith({
          error: 'Protocolo ya existe'
        });
      });

      test('19. Debe manejar errores SQL específicos', async () => {
        const protocolName = 'SQL Error Protocol';
        mockReq.body = { name: protocolName };

        const sqlError = new Error('SQL syntax error');
        mockPool.query.mockRejectedValueOnce(sqlError);

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(sqlError);
      });
    });

    describe('Casos edge cases', () => {
      test('20. Debe manejar nombres muy largos', async () => {
        const longName = 'A'.repeat(255);
        mockReq.body = { name: longName };

        const mockCreatedProtocol = {
          id: 127,
          key: 'a'.repeat(255).toLowerCase(),
          name: longName
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockCreatedProtocol]
        } as any);

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(mockCreatedProtocol);
      });

      test('21. Debe manejar nombres con números', async () => {
        const protocolName = 'Protocol Version 2.0';
        mockReq.body = { name: protocolName };

        const mockCreatedProtocol = {
          id: 128,
          key: 'protocol_version_20',
          name: protocolName
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockCreatedProtocol]
        } as any);

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        const query = mockPool.query.mock.calls[0];
        const generatedKey = query[1][0] as string;
        expect(generatedKey).toBe('protocol_version_20');
      });

      test('22. Debe manejar caracteres unicode', async () => {
        const protocolName = 'Protocolo 中文 اللغة العربية';
        mockReq.body = { name: protocolName };

        const mockCreatedProtocol = {
          id: 129,
          key: 'protocolo__',
          name: protocolName
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockCreatedProtocol]
        } as any);

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        const query = mockPool.query.mock.calls[0];
        const generatedKey = query[1][0] as string;
        // Verificar que solo contiene caracteres válidos
        expect(generatedKey).toMatch(/^[a-z0-9_]+$/);
      });

      test('23. Debe manejar múltiples espacios consecutivos', async () => {
        const protocolName = 'Protocol    With    Multiple    Spaces';
        mockReq.body = { name: protocolName };

        const mockCreatedProtocol = {
          id: 130,
          key: 'protocol_with_multiple_spaces',
          name: protocolName
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockCreatedProtocol]
        } as any);

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        const query = mockPool.query.mock.calls[0];
        const generatedKey = query[1][0] as string;
        expect(generatedKey).toBe('protocol_with_multiple_spaces');
        expect(generatedKey).not.toContain('  ');
      });
    });

    describe('Verificación de función makeKeyFromName', () => {
      test('24. Debe convertir correctamente nombres complejos', async () => {
        const complexName = 'Évaluation Protócol v2.1 (Revised)!';
        mockReq.body = { name: complexName };

        const mockCreatedProtocol = {
          id: 131,
          key: 'evaluation_protocol_v21_revised',
          name: complexName
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockCreatedProtocol]
        } as any);

        await createProtocol(mockReq as Request, mockRes as Response, mockNext);

        const query = mockPool.query.mock.calls[0];
        const generatedKey = query[1][0] as string;
        
        // Verificar transformaciones específicas
        expect(generatedKey).not.toContain('É');
        expect(generatedKey).not.toContain('ó');
        expect(generatedKey).not.toContain('(');
        expect(generatedKey).not.toContain(')');
        expect(generatedKey).not.toContain('!');
        expect(generatedKey).not.toContain('.');
        expect(generatedKey).toMatch(/^[a-z0-9_]+$/);
      });
    });
  });
}); 