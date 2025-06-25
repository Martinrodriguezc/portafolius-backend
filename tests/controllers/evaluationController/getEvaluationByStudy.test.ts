import request from 'supertest';
import { pool } from '../../../src/config/db';
import { createTestData, cleanTestData, createTestEvaluationForm, cleanTestEvaluationForm, TestData } from '../testUtils';
import jwt from 'jsonwebtoken';
import { config } from '../../../src/config';

// Configuración para tests de integración
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('GetEvaluationByStudy Controller - Tests de Integración', () => {
  let testData: TestData;
  let testStudyWithoutEvaluationId: number;
  let testEvaluationId: number;
  let olderEvaluationId: number;
  let authToken: string;
  let studentId: number;

  beforeAll(async () => {
    // Crear datos de prueba usando las utilidades
    testData = await createTestData();
    
    // Crear usuario estudiante adicional para el estudio sin evaluación
    const studentResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ('test-student-no-eval@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Student', 'estudiante')
       RETURNING id`
    );
    studentId = studentResult.rows[0].id;

    // Token JWT válido
    authToken = jwt.sign(
      { id: testData.teacher.id, email: testData.teacher.email, role: 'profesor' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Crear study sin evaluación
    const studyWithoutEvalResult = await pool.query(
      `INSERT INTO study (student_id, title, description, status)
       VALUES ($1, 'Test Study without Evaluation', 'Test Description', 'active')
       RETURNING id`,
      [studentId]
    );
    testStudyWithoutEvaluationId = studyWithoutEvalResult.rows[0].id;

    // Crear evaluación más antigua para el estudio principal
    olderEvaluationId = await createTestEvaluationForm(
      testData.studyId, 
      testData.teacher.id, 
      7, 
      'Evaluación más antigua'
    );

    // Crear evaluación más reciente (esta debe ser la que se retorne)
    testEvaluationId = await createTestEvaluationForm(
      testData.studyId, 
      testData.teacher.id, 
      9, 
      'Evaluación más reciente - Excelente trabajo'
    );
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await cleanTestEvaluationForm(testEvaluationId);
    await cleanTestEvaluationForm(olderEvaluationId);
    await pool.query(`DELETE FROM study WHERE id = $1`, [testStudyWithoutEvaluationId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [studentId]);
    await cleanTestData(testData);
  });

  describe('GET /evaluations/by-study/:studyId', () => {
    test('1. Debe obtener la evaluación más reciente de un estudio', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-study/${testData.studyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('evaluation');
      
      const evaluation = response.body.evaluation;
      expect(evaluation).toHaveProperty('id', testEvaluationId);
      expect(evaluation).toHaveProperty('study_id', testData.studyId);
      expect(evaluation).toHaveProperty('score', 9);
      expect(evaluation).toHaveProperty('feedback_summary', 'Evaluación más reciente - Excelente trabajo');
      expect(evaluation).toHaveProperty('submitted_at');
      expect(evaluation).toHaveProperty('teacher_first_name');
      expect(evaluation).toHaveProperty('teacher_last_name');
    });

    test('2. Debe retornar la evaluación más reciente cuando hay múltiples evaluaciones', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-study/${testData.studyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Debe retornar la evaluación más reciente (testEvaluationId), no la más antigua
      const evaluation = response.body.evaluation;
      expect(evaluation.id).toBe(testEvaluationId);
      expect(evaluation.id).not.toBe(olderEvaluationId);
      expect(evaluation.score).toBe(9);
    });

    test('3. Debe incluir información completa del profesor', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-study/${testData.studyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const evaluation = response.body.evaluation;
      expect(evaluation).toHaveProperty('teacher_first_name');
      expect(evaluation).toHaveProperty('teacher_last_name');
      expect(typeof evaluation.teacher_first_name).toBe('string');
      expect(typeof evaluation.teacher_last_name).toBe('string');
      expect(evaluation.teacher_first_name.length).toBeGreaterThan(0);
      expect(evaluation.teacher_last_name.length).toBeGreaterThan(0);
    });

    test('4. Debe retornar 404 para estudio sin evaluaciones', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-study/${testStudyWithoutEvaluationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        msg: 'No se encontró evaluación para este estudio'
      });
    });

    test('5. Debe retornar 404 para studyId inexistente', async () => {
      const response = await request(baseURL)
        .get('/evaluations/by-study/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        msg: 'No se encontró evaluación para este estudio'
      });
    });

    test('6. Debe manejar studyId inválido (no numérico)', async () => {
      const response = await request(baseURL)
        .get('/evaluations/by-study/invalid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        msg: 'Error al obtener evaluación'
      });
    });

    test('7. Debe verificar que el score está en rango válido', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-study/${testData.studyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const evaluation = response.body.evaluation;
      expect(evaluation.score).toBeGreaterThanOrEqual(1);
      expect(evaluation.score).toBeLessThanOrEqual(10);
      expect(typeof evaluation.score).toBe('number');
    });

    test('8. Debe incluir feedback_summary válido', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-study/${testData.studyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const evaluation = response.body.evaluation;
      expect(evaluation).toHaveProperty('feedback_summary');
      expect(typeof evaluation.feedback_summary).toBe('string');
      expect(evaluation.feedback_summary.length).toBeGreaterThan(0);
    });

    test('9. Debe verificar que submitted_at es una fecha válida', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-study/${testData.studyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const evaluation = response.body.evaluation;
      expect(evaluation).toHaveProperty('submitted_at');
      expect(new Date(evaluation.submitted_at)).toBeInstanceOf(Date);
      expect(new Date(evaluation.submitted_at).getTime()).not.toBeNaN();
    });

    test('10. Debe manejar falta de token de autorización', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-study/${testData.studyId}`);

      expect(response.status).toBe(401);
    });

    test('11. Debe aplicar correctamente el LIMIT 1 y ORDER BY', async () => {
      // Crear una tercera evaluación para asegurar que solo se retorna una
      const thirdEvaluationId = await createTestEvaluationForm(
        testData.studyId, 
        testData.teacher.id, 
        8, 
        'Tercera evaluación'
      );

      const response = await request(baseURL)
        .get(`/evaluations/by-study/${testData.studyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('evaluation');
      
      // Debe ser un objeto único, no un array
      expect(typeof response.body.evaluation).toBe('object');
      expect(Array.isArray(response.body.evaluation)).toBe(false);

      // Limpiar la evaluación extra
      await cleanTestEvaluationForm(thirdEvaluationId);
    });

    test('12. Debe retornar la estructura correcta de respuesta', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-study/${testData.studyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(['evaluation']);
      
      const evaluation = response.body.evaluation;
      const expectedKeys = [
        'id', 
        'study_id', 
        'score', 
        'feedback_summary', 
        'submitted_at', 
        'teacher_first_name', 
        'teacher_last_name'
      ];
      
      expectedKeys.forEach(key => {
        expect(evaluation).toHaveProperty(key);
      });
    });
  });
}); 