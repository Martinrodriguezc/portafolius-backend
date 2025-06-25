import request from 'supertest';
import { pool } from '../../../src/config/db';
import { createTestData, cleanTestData, TestData } from '../testUtils';
import jwt from 'jsonwebtoken';
import { config } from '../../../src/config';

// Configuración para tests de integración
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('ListResponses Controller - Tests de Integración', () => {
  let testData: TestData;
  let authToken: string;

  beforeAll(async () => {
    // Crear datos de prueba usando las utilidades
    testData = await createTestData();

    // Crear algunas respuestas de prueba
    await pool.query(
      `INSERT INTO evaluation_response (attempt_id, protocol_item_id, score)
       VALUES 
       ($1, $2, 8),
       ($1, $3, 9),
       ($1, $4, 7)`,
      [testData.attemptId, testData.protocolItemIds[0], testData.protocolItemIds[1], testData.protocolItemIds[2]]
    );

    // Generar token JWT válido para los tests
    authToken = jwt.sign(
      { id: testData.teacher.id, email: testData.teacher.email, role: testData.teacher.role },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await cleanTestData(testData);
  });

  describe('GET /attempts/:attemptId/responses', () => {
    test('1. Debe listar todas las respuestas de un attempt exitosamente', async () => {
      const response = await request(baseURL)
        .get(`/attempts/${testData.attemptId}/responses`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      
      // Verificar que tiene la estructura esperada
      expect(response.body[0]).toHaveProperty('protocol_item_id');
      expect(response.body[0]).toHaveProperty('score');
      
      // Verificar que están ordenadas por protocol_item_id
      const protocolItemIds = response.body.map((item: any) => item.protocol_item_id);
      expect(protocolItemIds).toEqual(testData.protocolItemIds);
      
      // Verificar los scores
      expect(response.body.find((item: any) => item.protocol_item_id === testData.protocolItemIds[0]).score).toBe(8);
      expect(response.body.find((item: any) => item.protocol_item_id === testData.protocolItemIds[1]).score).toBe(9);
      expect(response.body.find((item: any) => item.protocol_item_id === testData.protocolItemIds[2]).score).toBe(7);
    });

    test('2. Debe retornar array vacío para attempt sin respuestas', async () => {
      // Crear un nuevo attempt sin respuestas usando datos válidos
      const emptyAttemptResult = await pool.query(
        `INSERT INTO evaluation_attempt (clip_id, teacher_id)
         VALUES ($1, $2)
         RETURNING id`,
        [testData.clipId, testData.teacher.id]
      );
      const emptyAttemptId = emptyAttemptResult.rows[0].id;

      const response = await request(baseURL)
        .get(`/attempts/${emptyAttemptId}/responses`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      // Limpiar
      await pool.query(
        `DELETE FROM evaluation_attempt WHERE id = $1`,
        [emptyAttemptId]
      );
    });

    test('3. Debe manejar attemptId inexistente', async () => {
      const response = await request(baseURL)
        .get('/attempts/999999/responses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('4. Debe manejar attemptId inválido (no numérico)', async () => {
      const response = await request(baseURL)
        .get('/attempts/invalid/responses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        msg: "Error al listar respuestas"
      });
    });

    test('5. Debe filtrar respuestas por attempt_id específico', async () => {
      // Crear otro attempt con respuestas diferentes usando datos válidos
      const anotherAttemptResult = await pool.query(
        `INSERT INTO evaluation_attempt (clip_id, teacher_id)
         VALUES ($1, $2)
         RETURNING id`,
        [testData.clipId, testData.teacher.id]
      );
      const anotherAttemptId = anotherAttemptResult.rows[0].id;

      await pool.query(
        `INSERT INTO evaluation_response (attempt_id, protocol_item_id, score)
         VALUES ($1, $2, 5)`,
        [anotherAttemptId, testData.protocolItemIds[0]]
      );

      // Obtener respuestas del primer attempt
      const response1 = await request(baseURL)
        .get(`/attempts/${testData.attemptId}/responses`)
        .set('Authorization', `Bearer ${authToken}`);

      // Obtener respuestas del segundo attempt
      const response2 = await request(baseURL)
        .get(`/attempts/${anotherAttemptId}/responses`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      expect(response1.body).toHaveLength(3);
      expect(response2.body).toHaveLength(1);
      
      expect(response2.body[0].score).toBe(5);

      // Limpiar
      await pool.query(
        `DELETE FROM evaluation_response WHERE attempt_id = $1`,
        [anotherAttemptId]
      );
      await pool.query(
        `DELETE FROM evaluation_attempt WHERE id = $1`,
        [anotherAttemptId]
      );
    });
  });
}); 