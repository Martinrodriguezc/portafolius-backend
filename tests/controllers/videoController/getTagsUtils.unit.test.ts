import { Request, Response } from 'express';
import { getTagsUtils } from '../../../src/controllers/videoController/getTagsUtils';

// Mock de la base de datos
jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Mock del logger
jest.mock('../../../src/config/logger', () => ({
  error: jest.fn()
}));

const { pool } = require('../../../src/config/db');
const logger = require('../../../src/config/logger');

describe('getTagsUtils Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('Casos exitosos', () => {
    test('debe obtener la jerarquía de diagnóstico exitosamente', async () => {
      const mockOrgans = [
        { id: 1, name: 'Corazón' },
        { id: 2, name: 'Pulmón' }
      ];

      const mockStructures = [
        { id: 1, name: 'Ventrículo izquierdo', organ_id: 1 },
        { id: 2, name: 'Aurícula derecha', organ_id: 1 },
        { id: 3, name: 'Lóbulo superior', organ_id: 2 }
      ];

      const mockConditions = [
        { id: 1, name: 'Hipertrofia', structure_id: 1 },
        { id: 2, name: 'Dilatación', structure_id: 1 },
        { id: 3, name: 'Inflamación', structure_id: 3 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockOrgans })
        .mockResolvedValueOnce({ rows: mockStructures })
        .mockResolvedValueOnce({ rows: mockConditions });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        organs: mockOrgans,
        structures: mockStructures,
        conditions: mockConditions
      });
    });

    test('debe manejar resultados vacíos correctamente', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        organs: [],
        structures: [],
        conditions: []
      });
    });

    test('debe manejar datos con caracteres especiales', async () => {
      const mockOrgansSpecial = [
        { id: 1, name: 'Órgano con ñ y acentos' },
        { id: 2, name: 'Organ with special chars: @#$%' }
      ];

      const mockStructuresSpecial = [
        { id: 1, name: 'Estructura_con-guiones', organ_id: 1 },
        { id: 2, name: 'Structure with spaces & symbols!', organ_id: 2 }
      ];

      const mockConditionsSpecial = [
        { id: 1, name: 'Condición médica específica', structure_id: 1 },
        { id: 2, name: 'Medical condition (rare)', structure_id: 2 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockOrgansSpecial })
        .mockResolvedValueOnce({ rows: mockStructuresSpecial })
        .mockResolvedValueOnce({ rows: mockConditionsSpecial });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        organs: mockOrgansSpecial,
        structures: mockStructuresSpecial,
        conditions: mockConditionsSpecial
      });
    });

    test('debe manejar grandes volúmenes de datos', async () => {
      const mockLargeOrgans = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Órgano ${i + 1}`
      }));

      const mockLargeStructures = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        name: `Estructura ${i + 1}`,
        organ_id: Math.floor(i / 5) + 1
      }));

      const mockLargeConditions = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Condición ${i + 1}`,
        structure_id: Math.floor(i / 2) + 1
      }));

      pool.query
        .mockResolvedValueOnce({ rows: mockLargeOrgans })
        .mockResolvedValueOnce({ rows: mockLargeStructures })
        .mockResolvedValueOnce({ rows: mockLargeConditions });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        organs: mockLargeOrgans,
        structures: mockLargeStructures,
        conditions: mockLargeConditions
      });
    });
  });

  describe('Validación de queries SQL', () => {
    test('debe ejecutar la query correcta para órganos', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      const organQuery = pool.query.mock.calls[0][0];
      expect(organQuery.trim()).toBe(`SELECT id, name
      FROM organ
      ORDER BY name ASC`);
    });

    test('debe ejecutar la query correcta para estructuras', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      const structureQuery = pool.query.mock.calls[1][0];
      expect(structureQuery.trim()).toBe(`SELECT id, name, organ_id
      FROM structure
      ORDER BY name ASC`);
    });

    test('debe ejecutar la query correcta para condiciones', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      const conditionQuery = pool.query.mock.calls[2][0];
      expect(conditionQuery.trim()).toBe(`SELECT id, name, structure_id
      FROM condition
      ORDER BY name ASC`);
    });

    test('debe ejecutar las queries en el orden correcto', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Organ1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Structure1', organ_id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Condition1', structure_id: 1 }] });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(pool.query.mock.calls[0][0]).toContain('FROM organ');
      expect(pool.query.mock.calls[1][0]).toContain('FROM structure');
      expect(pool.query.mock.calls[2][0]).toContain('FROM condition');
    });

    test('debe incluir ORDER BY en todas las queries', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(pool.query.mock.calls[0][0]).toContain('ORDER BY name ASC');
      expect(pool.query.mock.calls[1][0]).toContain('ORDER BY name ASC');
      expect(pool.query.mock.calls[2][0]).toContain('ORDER BY name ASC');
    });
  });

  describe('Manejo de errores', () => {
    test('debe manejar error en la primera query (órganos)', async () => {
      const dbError = new Error('Database connection failed');
      pool.query.mockRejectedValueOnce(dbError);

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error al obtener la jerarquía de diagnóstico',
        { error: dbError }
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Error al obtener la jerarquía de diagnóstico'
      });
    });

    test('debe manejar error en la segunda query (estructuras)', async () => {
      const dbError = new Error('Table structure does not exist');
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Organ1' }] })
        .mockRejectedValueOnce(dbError);

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error al obtener la jerarquía de diagnóstico',
        { error: dbError }
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Error al obtener la jerarquía de diagnóstico'
      });
    });

    test('debe manejar error en la tercera query (condiciones)', async () => {
      const dbError = new Error('Permission denied on table condition');
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Organ1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Structure1', organ_id: 1 }] })
        .mockRejectedValueOnce(dbError);

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error al obtener la jerarquía de diagnóstico',
        { error: dbError }
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Error al obtener la jerarquía de diagnóstico'
      });
    });

    test('debe manejar errores de timeout', async () => {
      const timeoutError = new Error('Query timeout');
      pool.query.mockRejectedValueOnce(timeoutError);

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error al obtener la jerarquía de diagnóstico',
        { error: timeoutError }
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('debe manejar errores de SQL syntax', async () => {
      const sqlError = new Error('syntax error at or near "FORM"');
      pool.query.mockRejectedValueOnce(sqlError);

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error al obtener la jerarquía de diagnóstico',
        { error: sqlError }
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Error al obtener la jerarquía de diagnóstico'
      });
    });
  });

  describe('Casos edge', () => {
    test('debe manejar nombres con valores null', async () => {
      const mockOrgansWithNull = [
        { id: 1, name: 'Órgano Normal' },
        { id: 2, name: null }
      ];

      const mockStructuresWithNull = [
        { id: 1, name: null, organ_id: 1 },
        { id: 2, name: 'Estructura Normal', organ_id: 2 }
      ];

      const mockConditionsWithNull = [
        { id: 1, name: 'Condición Normal', structure_id: 1 },
        { id: 2, name: null, structure_id: 2 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockOrgansWithNull })
        .mockResolvedValueOnce({ rows: mockStructuresWithNull })
        .mockResolvedValueOnce({ rows: mockConditionsWithNull });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        organs: mockOrgansWithNull,
        structures: mockStructuresWithNull,
        conditions: mockConditionsWithNull
      });
    });

    test('debe manejar IDs con valores muy altos', async () => {
      const mockOrgansHighId = [
        { id: 2147483647, name: 'Órgano con ID máximo' },
        { id: 9999999999, name: 'Órgano con ID muy alto' }
      ];

      const mockStructuresHighId = [
        { id: 2147483647, name: 'Estructura con ID máximo', organ_id: 2147483647 }
      ];

      const mockConditionsHighId = [
        { id: 2147483647, name: 'Condición con ID máximo', structure_id: 2147483647 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockOrgansHighId })
        .mockResolvedValueOnce({ rows: mockStructuresHighId })
        .mockResolvedValueOnce({ rows: mockConditionsHighId });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        organs: mockOrgansHighId,
        structures: mockStructuresHighId,
        conditions: mockConditionsHighId
      });
    });

    test('debe manejar nombres muy largos', async () => {
      const longName = 'A'.repeat(1000);
      const mockOrgansLongName = [
        { id: 1, name: longName }
      ];

      const mockStructuresLongName = [
        { id: 1, name: longName, organ_id: 1 }
      ];

      const mockConditionsLongName = [
        { id: 1, name: longName, structure_id: 1 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockOrgansLongName })
        .mockResolvedValueOnce({ rows: mockStructuresLongName })
        .mockResolvedValueOnce({ rows: mockConditionsLongName });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        organs: mockOrgansLongName,
        structures: mockStructuresLongName,
        conditions: mockConditionsLongName
      });
    });

    test('debe manejar foreign keys inconsistentes', async () => {
      const mockOrgans = [
        { id: 1, name: 'Órgano 1' }
      ];

      const mockStructures = [
        { id: 1, name: 'Estructura 1', organ_id: 999 }, // organ_id que no existe
        { id: 2, name: 'Estructura 2', organ_id: 1 }
      ];

      const mockConditions = [
        { id: 1, name: 'Condición 1', structure_id: 888 }, // structure_id que no existe
        { id: 2, name: 'Condición 2', structure_id: 1 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockOrgans })
        .mockResolvedValueOnce({ rows: mockStructures })
        .mockResolvedValueOnce({ rows: mockConditions });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        organs: mockOrgans,
        structures: mockStructures,
        conditions: mockConditions
      });
    });
  });

  describe('Estructura de respuesta', () => {
    test('debe incluir todos los campos requeridos en la respuesta exitosa', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      const responseCall = mockRes.json as jest.Mock;
      const response = responseCall.mock.calls[0][0];

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('organs');
      expect(response).toHaveProperty('structures');
      expect(response).toHaveProperty('conditions');
      expect(response.success).toBe(true);
    });

    test('debe incluir todos los campos requeridos en la respuesta de error', async () => {
      const dbError = new Error('Database error');
      pool.query.mockRejectedValueOnce(dbError);

      await getTagsUtils(mockReq as Request, mockRes as Response);

      const responseCall = mockRes.json as jest.Mock;
      const response = responseCall.mock.calls[0][0];

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('msg');
      expect(response.success).toBe(false);
      expect(response.msg).toBe('Error al obtener la jerarquía de diagnóstico');
    });

    test('debe preservar el orden de los campos en órganos', async () => {
      const mockOrgans = [
        { id: 1, name: 'Órgano A' },
        { id: 2, name: 'Órgano B' }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockOrgans })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      const responseCall = mockRes.json as jest.Mock;
      const response = responseCall.mock.calls[0][0];

      expect(response.organs[0]).toHaveProperty('id');
      expect(response.organs[0]).toHaveProperty('name');
      expect(response.organs[0].id).toBe(1);
      expect(response.organs[0].name).toBe('Órgano A');
    });

    test('debe preservar el orden de los campos en estructuras', async () => {
      const mockStructures = [
        { id: 1, name: 'Estructura A', organ_id: 1 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: mockStructures })
        .mockResolvedValueOnce({ rows: [] });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      const responseCall = mockRes.json as jest.Mock;
      const response = responseCall.mock.calls[0][0];

      expect(response.structures[0]).toHaveProperty('id');
      expect(response.structures[0]).toHaveProperty('name');
      expect(response.structures[0]).toHaveProperty('organ_id');
      expect(response.structures[0].organ_id).toBe(1);
    });

    test('debe preservar el orden de los campos en condiciones', async () => {
      const mockConditions = [
        { id: 1, name: 'Condición A', structure_id: 1 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: mockConditions });

      await getTagsUtils(mockReq as Request, mockRes as Response);

      const responseCall = mockRes.json as jest.Mock;
      const response = responseCall.mock.calls[0][0];

      expect(response.conditions[0]).toHaveProperty('id');
      expect(response.conditions[0]).toHaveProperty('name');
      expect(response.conditions[0]).toHaveProperty('structure_id');
      expect(response.conditions[0].structure_id).toBe(1);
    });
  });
}); 