import request from 'supertest';
import { pool } from '../../../src/config/db';
import jwt from 'jsonwebtoken';
import { config } from '../../../src/config';

// Configuración para tests de integración
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('CreateEvaluation Controller - Tests de Integración', () => {
  let testStudyId: number;
  let teacherToken: string;
  let studentToken: string;
  let teacherId: number;
  let studentId: number;

    beforeAll(async () => {
    // 1. Crear usuario estudiante
    const studentResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ('test-student@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Student', 'estudiante')
       RETURNING id`
    );
    studentId = studentResult.rows[0].id;

    // 2. Crear usuario profesor
    const teacherResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ('test-teacher@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Teacher', 'profesor')
       RETURNING id`
    );
    teacherId = teacherResult.rows[0].id;

    // 3. Generar tokens JWT válidos para los tests
    teacherToken = jwt.sign(
      { id: teacherId, email: 'test-teacher@example.com', role: 'profesor' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    studentToken = jwt.sign(
      { id: studentId, email: 'test-student@example.com', role: 'estudiante' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4. Crear datos de prueba - study
    const studyResult = await pool.query(
      `INSERT INTO study (student_id, title, description, status)
       VALUES ($1, 'Test Study', 'Test Description', 'pendiente')
       RETURNING id`,
      [studentId]
    );
    testStudyId = studyResult.rows[0].id;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await pool.query(
      `DELETE FROM evaluation_form WHERE study_id = $1`,
      [testStudyId]
    );
    await pool.query(
      `DELETE FROM study WHERE id = $1`,
      [testStudyId]
    );
    await pool.query(
      `DELETE FROM users WHERE id IN ($1, $2)`,
      [studentId, teacherId]
    );
  });

  describe('POST /evaluations/:studyId', () => {
    test('1. Debe crear una evaluación exitosamente', async () => {
      const evaluationData = {
        score: 8,
        feedback_summary: 'Buen trabajo en general, mejorar en algunos aspectos.'
      };

      const response = await request(baseURL)
        .post(`/evaluations/${testStudyId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(evaluationData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('study_id', testStudyId);
      expect(response.body).toHaveProperty('teacher_id', teacherId);
      expect(response.body).toHaveProperty('score', 8);
      expect(response.body).toHaveProperty('feedback_summary', evaluationData.feedback_summary);
      expect(response.body).toHaveProperty('submitted_at');

      // Verificar que se guardó en la base de datos
      const dbResult = await pool.query(
        `SELECT * FROM evaluation_form WHERE id = $1`,
        [response.body.id]
      );

      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].score).toBe(8);
    });

    test('2. Debe rechazar score inválido (menor a 1)', async () => {
      const evaluationData = {
        score: 0,
        feedback_summary: 'Test feedback'
      };

      const response = await request(baseURL)
        .post(`/evaluations/${testStudyId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(evaluationData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        msg: 'Score debe ser número entre 1 y 10'
      });
    });

    test('3. Debe rechazar score inválido (mayor a 10)', async () => {
      const evaluationData = {
        score: 11,
        feedback_summary: 'Test feedback'
      };

      const response = await request(baseURL)
        .post(`/evaluations/${testStudyId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(evaluationData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        msg: 'Score debe ser número entre 1 y 10'
      });
    });

    test('4. Debe rechazar score no numérico', async () => {
      const evaluationData = {
        score: 'invalid',
        feedback_summary: 'Test feedback'
      };

      const response = await request(baseURL)
        .post(`/evaluations/${testStudyId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(evaluationData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        msg: 'Score debe ser número entre 1 y 10'
      });
    });

    test('5. Debe manejar studyId inexistente', async () => {
      const evaluationData = {
        score: 8,
        feedback_summary: 'Test feedback'
      };

      const response = await request(baseURL)
        .post('/evaluations/999999')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(evaluationData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        msg: 'Error al crear evaluación'
      });
    });
  });


}); 