import request from 'supertest';
import { pool } from '../../../src/config/db';
import jwt from 'jsonwebtoken';
import { config } from '../../../src/config';

// Configuración para tests de integración
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('UpdateEvaluation Controller - Tests de Integración', () => {
  let testStudyId: number;
  let testEvaluationId: number;
  let anotherEvaluationId: number;
  let teacherToken: string;
  let anotherTeacherToken: string;
  let teacherId: number;
  let anotherTeacherId: number;
  let studentId: number;

  beforeAll(async () => {
    // 1. Crear usuario estudiante
    const studentResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ('test-student-update@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Student', 'estudiante')
       RETURNING id`
    );
    studentId = studentResult.rows[0].id;

    // 2. Crear primer profesor
    const teacherResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ('test-teacher-update@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Teacher', 'profesor')
       RETURNING id`
    );
    teacherId = teacherResult.rows[0].id;

    // 3. Crear segundo profesor
    const anotherTeacherResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ('test-teacher2-update@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Another', 'Teacher', 'profesor')
       RETURNING id`
    );
    anotherTeacherId = anotherTeacherResult.rows[0].id;

    // 4. Generar tokens JWT válidos para los tests
    teacherToken = jwt.sign(
      { id: teacherId, email: 'test-teacher-update@example.com', role: 'profesor' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    anotherTeacherToken = jwt.sign(
      { id: anotherTeacherId, email: 'test-teacher2-update@example.com', role: 'profesor' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 5. Crear datos de prueba - study
    const studyResult = await pool.query(
      `INSERT INTO study (student_id, title, description, status)
       VALUES ($1, 'Test Study for Update', 'Test Description', 'pendiente')
       RETURNING id`,
      [studentId]
    );
    testStudyId = studyResult.rows[0].id;

    // Crear evaluación del primer profesor
    const evaluationResult = await pool.query(
      `INSERT INTO evaluation_form (study_id, teacher_id, score, feedback_summary)
       VALUES ($1, $2, 8, 'Evaluación inicial para actualizar')
       RETURNING id`,
      [testStudyId, teacherId]
    );
    testEvaluationId = evaluationResult.rows[0].id;

    // Crear evaluación del segundo profesor
    const anotherEvaluationResult = await pool.query(
      `INSERT INTO evaluation_form (study_id, teacher_id, score, feedback_summary)
       VALUES ($1, $2, 7, 'Evaluación de otro profesor')
       RETURNING id`,
      [testStudyId, anotherTeacherId]
    );
    anotherEvaluationId = anotherEvaluationResult.rows[0].id;
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
      `DELETE FROM users WHERE id IN ($1, $2, $3)`,
      [studentId, teacherId, anotherTeacherId]
    );
  });

  describe('PUT /evaluations/:id', () => {
    test('1. Debe actualizar evaluación exitosamente', async () => {
      const updateData = {
        score: 9,
        feedback_summary: 'Evaluación actualizada - Excelente trabajo'
      };

      const response = await request(baseURL)
        .put(`/evaluations/${testEvaluationId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testEvaluationId);
      expect(response.body).toHaveProperty('study_id', testStudyId);
      expect(response.body).toHaveProperty('teacher_id', teacherId);
      expect(response.body).toHaveProperty('score', 9);
      expect(response.body).toHaveProperty('feedback_summary', updateData.feedback_summary);
      expect(response.body).toHaveProperty('submitted_at');

      // Verificar que se actualizó en la base de datos
      const dbResult = await pool.query(
        `SELECT * FROM evaluation_form WHERE id = $1`,
        [testEvaluationId]
      );

      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].score).toBe(9);
      expect(dbResult.rows[0].feedback_summary).toBe(updateData.feedback_summary);
    });

    test('2. Debe rechazar score inválido (menor a 1)', async () => {
      const updateData = {
        score: 0,
        feedback_summary: 'Test feedback'
      };

      const response = await request(baseURL)
        .put(`/evaluations/${testEvaluationId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        msg: 'Score debe ser un número entre 1 y 10'
      });
    });

    test('3. Debe rechazar score inválido (mayor a 10)', async () => {
      const updateData = {
        score: 11,
        feedback_summary: 'Test feedback'
      };

      const response = await request(baseURL)
        .put(`/evaluations/${testEvaluationId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        msg: 'Score debe ser un número entre 1 y 10'
      });
    });

    test('4. Debe rechazar score no numérico', async () => {
      const updateData = {
        score: 'invalid',
        feedback_summary: 'Test feedback'
      };

      const response = await request(baseURL)
        .put(`/evaluations/${testEvaluationId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        msg: 'Score debe ser un número entre 1 y 10'
      });
    });

    test('5. Debe rechazar actualización por profesor no autorizado', async () => {
      const updateData = {
        score: 8,
        feedback_summary: 'Intento de actualización no autorizada'
      };

      const response = await request(baseURL)
        .put(`/evaluations/${testEvaluationId}`)
        .set('Authorization', `Bearer ${anotherTeacherToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        msg: 'No tienes permiso para editar esta evaluación'
      });
    });

    test('6. Debe manejar evaluación inexistente', async () => {
      const updateData = {
        score: 8,
        feedback_summary: 'Test feedback'
      };

      const response = await request(baseURL)
        .put('/evaluations/999999')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        msg: 'No tienes permiso para editar esta evaluación'
      });
    });

    test('7. Debe actualizar solo el score manteniendo el feedback', async () => {
      // Primero obtener el feedback actual
      const currentData = await pool.query(
        `SELECT feedback_summary FROM evaluation_form WHERE id = $1`,
        [testEvaluationId]
      );
      const currentFeedback = currentData.rows[0].feedback_summary;

      const updateData = {
        score: 10,
        feedback_summary: currentFeedback
      };

      const response = await request(baseURL)
        .put(`/evaluations/${testEvaluationId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.score).toBe(10);
      expect(response.body.feedback_summary).toBe(currentFeedback);
    });

    test('8. Debe actualizar solo el feedback manteniendo el score', async () => {
      // Primero obtener el score actual
      const currentData = await pool.query(
        `SELECT score FROM evaluation_form WHERE id = $1`,
        [testEvaluationId]
      );
      const currentScore = currentData.rows[0].score;

      const updateData = {
        score: currentScore,
        feedback_summary: 'Nuevo feedback actualizado'
      };

      const response = await request(baseURL)
        .put(`/evaluations/${testEvaluationId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.score).toBe(currentScore);
      expect(response.body.feedback_summary).toBe('Nuevo feedback actualizado');
    });

    test('9. Debe manejar token inválido', async () => {
      const updateData = {
        score: 8,
        feedback_summary: 'Test feedback'
      };

      const response = await request(baseURL)
        .put(`/evaluations/${testEvaluationId}`)
        .set('Authorization', 'Bearer invalid_token')
        .send(updateData);

      expect(response.status).toBe(403);
    });

    test('10. Debe manejar falta de token de autorización', async () => {
      const updateData = {
        score: 8,
        feedback_summary: 'Test feedback'
      };

      const response = await request(baseURL)
        .put(`/evaluations/${testEvaluationId}`)
        .send(updateData);

      expect(response.status).toBe(401);
    });

    test('11. Debe preservar los campos no modificables', async () => {
      // Obtener datos actuales
      const beforeUpdate = await pool.query(
        `SELECT * FROM evaluation_form WHERE id = $1`,
        [testEvaluationId]
      );

      const updateData = {
        score: 6,
        feedback_summary: 'Feedback final'
      };

      const response = await request(baseURL)
        .put(`/evaluations/${testEvaluationId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      
      // Verificar que campos como study_id y teacher_id no cambiaron
      expect(response.body.study_id).toBe(beforeUpdate.rows[0].study_id);
      expect(response.body.teacher_id).toBe(beforeUpdate.rows[0].teacher_id);
      expect(response.body.id).toBe(beforeUpdate.rows[0].id);
    });

    test('12. Debe verificar que la fecha de submitted_at se mantiene', async () => {
      const updateData = {
        score: 5,
        feedback_summary: 'Test para verificar fecha'
      };

      const response = await request(baseURL)
        .put(`/evaluations/${testEvaluationId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('submitted_at');
      expect(new Date(response.body.submitted_at)).toBeInstanceOf(Date);
    });
  });
}); 