import { Request, Response, NextFunction } from 'express';
import { getProtocol } from '../../../src/controllers/protocolController/getProtocol';
import { pool } from '../../../src/config/db';
import { createUniqueTestData } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');

const mockPool = pool as jest.Mocked<typeof pool>;

describe('GetProtocol Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let testData: ReturnType<typeof createUniqueTestData>;

  beforeEach(() => {
    testData = {
      ...createUniqueTestData(),
      protocolId: 123
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
    test('1. Debe obtener protocolo con secciones e items exitosamente', async () => {
      const protocolKey = 'test_protocol';
      mockReq.params = { key: protocolKey };

      const mockProtocol = {
        id: testData.protocolId,
        name: `Test Protocol ${testData.timestamp}`,
        key: protocolKey
      };

      const mockSections = [
        { id: 1, key: 'section1', name: 'Section 1' },
        { id: 2, key: 'section2', name: 'Section 2' }
      ];

      const mockItems1 = [
        { key: 'item1_1', label: 'Item 1.1', score_scale: '1-5', max_score: 5 },
        { key: 'item1_2', label: 'Item 1.2', score_scale: '1-3', max_score: 3 }
      ];

      const mockItems2 = [
        { key: 'item2_1', label: 'Item 2.1', score_scale: '1-10', max_score: 10 }
      ];

      // Mock protocol query
      mockPool.query
        .mockResolvedValueOnce({
          rows: [mockProtocol]
        } as any)
        // Mock sections query
        .mockResolvedValueOnce({
          rows: mockSections
        } as any)
        // Mock items for section 1
        .mockResolvedValueOnce({
          rows: mockItems1
        } as any)
        // Mock items for section 2
        .mockResolvedValueOnce({
          rows: mockItems2
        } as any);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledTimes(4);
      
      // Verificar query del protocolo
      expect(mockPool.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('SELECT id, name, key'),
        [protocolKey]
      );

      // Verificar query de secciones
      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('FROM protocol_section'),
        [testData.protocolId]
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        key: protocolKey,
        name: mockProtocol.name,
        sections: [
          {
            key: 'section1',
            name: 'Section 1',
            items: mockItems1
          },
          {
            key: 'section2',
            name: 'Section 2',
            items: mockItems2
          }
        ]
      });
    });

    test('2. Debe manejar protocolo sin secciones', async () => {
      const protocolKey = 'empty_protocol';
      mockReq.params = { key: protocolKey };

      const mockProtocol = {
        id: testData.protocolId,
        name: 'Empty Protocol',
        key: protocolKey
      };

      mockPool.query
        .mockResolvedValueOnce({
          rows: [mockProtocol]
        } as any)
        .mockResolvedValueOnce({
          rows: []
        } as any);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        key: protocolKey,
        name: mockProtocol.name,
        sections: []
      });
    });

    test('3. Debe manejar secciones sin items', async () => {
      const protocolKey = 'protocol_no_items';
      mockReq.params = { key: protocolKey };

      const mockProtocol = {
        id: testData.protocolId,
        name: 'Protocol No Items',
        key: protocolKey
      };

      const mockSections = [
        { id: 1, key: 'empty_section', name: 'Empty Section' }
      ];

      mockPool.query
        .mockResolvedValueOnce({
          rows: [mockProtocol]
        } as any)
        .mockResolvedValueOnce({
          rows: mockSections
        } as any)
        .mockResolvedValueOnce({
          rows: []
        } as any);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        key: protocolKey,
        name: mockProtocol.name,
        sections: [
          {
            key: 'empty_section',
            name: 'Empty Section',
            items: []
          }
        ]
      });
    });

    test('4. Debe ordenar secciones por sort_order', async () => {
      const protocolKey = 'ordered_protocol';
      mockReq.params = { key: protocolKey };

      const mockProtocol = {
        id: testData.protocolId,
        name: 'Ordered Protocol',
        key: protocolKey
      };

      mockPool.query
        .mockResolvedValueOnce({
          rows: [mockProtocol]
        } as any)
        .mockResolvedValueOnce({
          rows: []
        } as any);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      const sectionsQuery = mockPool.query.mock.calls[1][0] as string;
      expect(sectionsQuery).toContain('ORDER BY sort_order');
    });

    test('5. Debe ordenar items por id', async () => {
      const protocolKey = 'ordered_items_protocol';
      mockReq.params = { key: protocolKey };

      const mockProtocol = {
        id: testData.protocolId,
        name: 'Ordered Items Protocol',
        key: protocolKey
      };

      const mockSections = [
        { id: 1, key: 'section1', name: 'Section 1' }
      ];

      mockPool.query
        .mockResolvedValueOnce({
          rows: [mockProtocol]
        } as any)
        .mockResolvedValueOnce({
          rows: mockSections
        } as any)
        .mockResolvedValueOnce({
          rows: []
        } as any);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      const itemsQuery = mockPool.query.mock.calls[2][0] as string;
      expect(itemsQuery).toContain('ORDER BY id');
    });
  });

  describe('Casos de error - Protocolo no encontrado', () => {
    test('6. Debe retornar 404 cuando el protocolo no existe', async () => {
      const protocolKey = 'non_existent_protocol';
      mockReq.params = { key: protocolKey };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Protocolo no encontrado'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('7. Debe manejar correctamente array vacío de resultados', async () => {
      const protocolKey = 'missing_protocol';
      mockReq.params = { key: protocolKey };

      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, key'),
        [protocolKey]
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('8. Debe manejar errores en la query del protocolo', async () => {
      const protocolKey = 'error_protocol';
      mockReq.params = { key: protocolKey };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('9. Debe manejar errores en la query de secciones', async () => {
      const protocolKey = 'sections_error_protocol';
      mockReq.params = { key: protocolKey };

      const mockProtocol = {
        id: testData.protocolId,
        name: 'Sections Error Protocol',
        key: protocolKey
      };

      const sectionsError = new Error('Sections query failed');
      mockPool.query
        .mockResolvedValueOnce({
          rows: [mockProtocol]
        } as any)
        .mockRejectedValueOnce(sectionsError);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(sectionsError);
    });

    test('10. Debe manejar errores en la query de items', async () => {
      const protocolKey = 'items_error_protocol';
      mockReq.params = { key: protocolKey };

      const mockProtocol = {
        id: testData.protocolId,
        name: 'Items Error Protocol',
        key: protocolKey
      };

      const mockSections = [
        { id: 1, key: 'section1', name: 'Section 1' }
      ];

      const itemsError = new Error('Items query failed');
      mockPool.query
        .mockResolvedValueOnce({
          rows: [mockProtocol]
        } as any)
        .mockResolvedValueOnce({
          rows: mockSections
        } as any)
        .mockRejectedValueOnce(itemsError);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(itemsError);
    });

    test('11. Debe manejar errores SQL específicos', async () => {
      const protocolKey = 'sql_error_protocol';
      mockReq.params = { key: protocolKey };

      const sqlError = new Error('SQL syntax error');
      mockPool.query.mockRejectedValueOnce(sqlError);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(sqlError);
    });
  });

  describe('Casos edge cases', () => {
    test('12. Debe manejar protocolo con caracteres especiales en key', async () => {
      const protocolKey = 'protocol_with_special-chars_123';
      mockReq.params = { key: protocolKey };

      const mockProtocol = {
        id: testData.protocolId,
        name: 'Protocol with Special Chars',
        key: protocolKey
      };

      mockPool.query
        .mockResolvedValueOnce({
          rows: [mockProtocol]
        } as any)
        .mockResolvedValueOnce({
          rows: []
        } as any);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [protocolKey]
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        key: protocolKey,
        name: mockProtocol.name,
        sections: []
      });
    });

    test('13. Debe manejar múltiples secciones con múltiples items', async () => {
      const protocolKey = 'complex_protocol';
      mockReq.params = { key: protocolKey };

      const mockProtocol = {
        id: testData.protocolId,
        name: 'Complex Protocol',
        key: protocolKey
      };

      const mockSections = [
        { id: 1, key: 'section1', name: 'Section 1' },
        { id: 2, key: 'section2', name: 'Section 2' },
        { id: 3, key: 'section3', name: 'Section 3' }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockProtocol] } as any)
        .mockResolvedValueOnce({ rows: mockSections } as any)
        .mockResolvedValueOnce({ rows: [{ key: 'item1', label: 'Item 1', score_scale: '1-5', max_score: 5 }] } as any)
        .mockResolvedValueOnce({ rows: [{ key: 'item2', label: 'Item 2', score_scale: '1-3', max_score: 3 }] } as any)
        .mockResolvedValueOnce({ rows: [{ key: 'item3', label: 'Item 3', score_scale: '1-10', max_score: 10 }] } as any);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledTimes(5); // 1 protocol + 1 sections + 3 items queries
      expect(mockRes.json).toHaveBeenCalledWith({
        key: protocolKey,
        name: mockProtocol.name,
        sections: expect.arrayContaining([
          expect.objectContaining({ key: 'section1', name: 'Section 1' }),
          expect.objectContaining({ key: 'section2', name: 'Section 2' }),
          expect.objectContaining({ key: 'section3', name: 'Section 3' })
        ])
      });
    });

    test('14. Debe manejar items con valores null/undefined', async () => {
      const protocolKey = 'null_values_protocol';
      mockReq.params = { key: protocolKey };

      const mockProtocol = {
        id: testData.protocolId,
        name: 'Null Values Protocol',
        key: protocolKey
      };

      const mockSections = [
        { id: 1, key: 'section1', name: 'Section 1' }
      ];

      const mockItems = [
        { key: 'item1', label: null, score_scale: '1-5', max_score: 5 },
        { key: 'item2', label: 'Item 2', score_scale: null, max_score: 3 }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockProtocol] } as any)
        .mockResolvedValueOnce({ rows: mockSections } as any)
        .mockResolvedValueOnce({ rows: mockItems } as any);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        key: protocolKey,
        name: mockProtocol.name,
        sections: [
          {
            key: 'section1',
            name: 'Section 1',
            items: mockItems
          }
        ]
      });
    });
  });

  describe('Verificación de queries SQL', () => {
    test('15. Debe usar las queries SQL correctas', async () => {
      const protocolKey = 'verify_sql_protocol';
      mockReq.params = { key: protocolKey };

      const mockProtocol = {
        id: testData.protocolId,
        name: 'Verify SQL Protocol',
        key: protocolKey
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockProtocol] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      // Verificar query del protocolo
      const protocolQuery = mockPool.query.mock.calls[0][0] as string;
      expect(protocolQuery).toContain('SELECT id, name, key');
      expect(protocolQuery).toContain('FROM protocol');
      expect(protocolQuery).toContain('WHERE key = $1');

      // Verificar query de secciones
      const sectionsQuery = mockPool.query.mock.calls[1][0] as string;
      expect(sectionsQuery).toContain('SELECT id, key, name');
      expect(sectionsQuery).toContain('FROM protocol_section');
      expect(sectionsQuery).toContain('WHERE protocol_id = $1');
      expect(sectionsQuery).toContain('ORDER BY sort_order');
    });

    test('16. Debe usar Promise.all para queries de items', async () => {
      const protocolKey = 'promise_all_protocol';
      mockReq.params = { key: protocolKey };

      const mockProtocol = {
        id: testData.protocolId,
        name: 'Promise All Protocol',
        key: protocolKey
      };

      const mockSections = [
        { id: 1, key: 'section1', name: 'Section 1' },
        { id: 2, key: 'section2', name: 'Section 2' }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockProtocol] } as any)
        .mockResolvedValueOnce({ rows: mockSections } as any)
        .mockResolvedValue({ rows: [] } as any);

      await getProtocol(mockReq as Request, mockRes as Response, mockNext);

      // Debe hacer 1 query de protocolo + 1 de secciones + 2 de items (una por sección)
      expect(mockPool.query).toHaveBeenCalledTimes(4);
    });
  });
}); 