import { Request, Response } from 'express';
import { assignTagsToClip } from '../../../src/controllers/videoController/assignTagsToClip';
import { pool } from '../../../src/config/db';
import logger from '../../../src/config/logger';
import { createUniqueTestData } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');
jest.mock('../../../src/config/logger');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('AssignTagsToClip Controller - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let testData: ReturnType<typeof createUniqueTestData>;

  beforeEach(() => {
    testData = createUniqueTestData();
    
    mockReq = {
      params: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Casos exitosos', () => {
    test('1. Debe asignar tags al clip exitosamente', async () => {
      const clipId = '123';
      const tagIds = [1, 2, 3];
      const userId = 1; // Usar número en lugar de testData.userId

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      // Mock successful Promise.all queries
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // Primera query
        .mockResolvedValueOnce({ rows: [] }) // Segunda query  
        .mockResolvedValueOnce({ rows: [] }); // Tercera query

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      
      // Verificar que se llamó a cada query con los parámetros correctos
      tagIds.forEach((tagId, index) => {
        expect(mockPool.query).toHaveBeenNthCalledWith(
          index + 1,
          `INSERT INTO clip_tag (clip_id, tag_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
          [123, tagId, userId]
        );
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Etiquetas asignadas correctamente'
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Etiquetas [${tagIds.join(",")}] asignadas al clip 123`
      );
    });

    test('2. Debe manejar un solo tag', async () => {
      const clipId = '456';
      const tagIds = [1];
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        `INSERT INTO clip_tag (clip_id, tag_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [456, 1, userId]
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Etiquetas [1] asignadas al clip 456'
      );
    });

    test('3. Debe manejar múltiples tags correctamente', async () => {
      const clipId = '789';
      const tagIds = [10, 20, 30, 40, 50];
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      // Mock 5 successful queries
      for (let i = 0; i < 5; i++) {
        (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      }

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledTimes(5);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Etiquetas [10,20,30,40,50] asignadas al clip 789'
      );
    });

    test('4. Debe usar ON CONFLICT DO NOTHING para evitar duplicados', async () => {
      const clipId = '999';
      const tagIds = [1];
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      const actualQuery = mockPool.query.mock.calls[0][0] as string;
      expect(actualQuery).toContain('ON CONFLICT DO NOTHING');
    });

    test('5. Debe manejar array vacío de tagIds', async () => {
      const clipId = '123';
      const tagIds: number[] = [];
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Etiquetas asignadas correctamente'
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Etiquetas [] asignadas al clip 123'
      );
    });
  });

  describe('Casos de error - Validación de parámetros', () => {
    test('6. Debe retornar 400 para clipId inválido (no numérico)', async () => {
      mockReq.params = { clipId: 'invalid-id' };
      mockReq.body = { tagIds: [1], userId: 1 };

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'clipId inválido'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('7. Debe procesar clipId vacío como 0', async () => {
      mockReq.params = { clipId: '' };
      mockReq.body = { tagIds: [1], userId: 1 };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Etiquetas asignadas correctamente'
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO clip_tag'),
        [0, 1, 1] // clipId se convierte a 0
      );
    });

    test('8. Debe retornar 400 cuando tagIds no es array', async () => {
      mockReq.params = { clipId: '123' };
      mockReq.body = { tagIds: 'not-an-array', userId: 1 };

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe enviar un array de tagIds'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('9. Debe retornar 400 cuando tagIds es null', async () => {
      mockReq.params = { clipId: '123' };
      mockReq.body = { tagIds: null, userId: 1 };

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe enviar un array de tagIds'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('10. Debe retornar 400 cuando tagIds es undefined', async () => {
      mockReq.params = { clipId: '123' };
      mockReq.body = { userId: 1 };

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe enviar un array de tagIds'
      });
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Casos de error - Base de datos', () => {
    test('11. Debe manejar errores de base de datos', async () => {
      const clipId = '123';
      const tagIds = [1, 2];
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      const dbError = new Error('Database connection failed');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al asignar etiquetas al clip'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al asignar etiquetas al clip:',
        dbError
      );
    });

    test('12. Debe manejar error en Promise.all cuando falla una query', async () => {
      const clipId = '456';
      const tagIds = [1, 2, 3];
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      // Primera query éxito, segunda falla
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('SQL constraint violation'));

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al asignar etiquetas al clip'
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('13. Debe manejar errores de constraint violations', async () => {
      const clipId = '789';
      const tagIds = [1];
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      const constraintError = new Error('violates foreign key constraint');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(constraintError);

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al asignar etiquetas al clip'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al asignar etiquetas al clip:',
        constraintError
      );
    });
  });

  describe('Casos edge cases', () => {
    test('14. Debe manejar clipId con ceros al inicio', async () => {
      const clipId = '00123';
      const tagIds = [1];
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [123, 1, userId] // Se convierte a número
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('15. Debe manejar tagIds con números grandes', async () => {
      const clipId = '123';
      const tagIds = [999999, 1000000];
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Etiquetas [999999,1000000] asignadas al clip 123'
      );
    });

    test('16. Debe manejar userId null o undefined', async () => {
      const clipId = '123';
      const tagIds = [1];

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId: null };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [123, 1, null]
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('17. Debe manejar tagIds con valores duplicados', async () => {
      const clipId = '123';
      const tagIds = [1, 1, 2, 2, 3]; // Duplicados
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      // Aunque hay duplicados, se procesarán todos (ON CONFLICT DO NOTHING manejará duplicados)
      for (let i = 0; i < 5; i++) {
        (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      }

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledTimes(5);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Verificación de logging', () => {
    test('18. Debe logear correctamente con un tag', async () => {
      const clipId = '123';
      const tagIds = [42];
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Etiquetas [42] asignadas al clip 123'
      );
    });

    test('19. Debe logear correctamente con múltiples tags', async () => {
      const clipId = '456';
      const tagIds = [1, 2, 3, 4, 5];
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      for (let i = 0; i < 5; i++) {
        (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      }

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Etiquetas [1,2,3,4,5] asignadas al clip 456'
      );
    });

    test('20. Debe logear error correctamente', async () => {
      const clipId = '789';
      const tagIds = [1];
      const userId = 1;

      mockReq.params = { clipId };
      mockReq.body = { tagIds, userId };

      const testError = new Error('Test error');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(testError);

      await assignTagsToClip(mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al asignar etiquetas al clip:',
        testError
      );
    });
  });

  console.log('✅ Tests unitarios del AssignTagsToClip Controller completados:');
  console.log('   - Casos exitosos (5 tests)');
  console.log('   - Casos de validación (5 tests)');
  console.log('   - Casos de error - Base de datos (3 tests)');
  console.log('   - Casos edge cases (4 tests)');
  console.log('   - Verificación de logging (3 tests)');
  console.log('   - Total: 20 tests unitarios');
}); 