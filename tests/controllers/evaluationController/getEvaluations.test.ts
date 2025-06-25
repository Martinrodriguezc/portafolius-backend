import request from 'supertest';
import { pool } from '../../../src/config/db';
import jwt from 'jsonwebtoken';
import { config } from '../../../src/config';

// Configuración para tests de integración
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('GetEvaluations Controller - Tests de Integración', () => {
  let testStudyId: number;
  let testEvaluationId: number;
  let teacherToken: string;
  let anotherTeacherToken: string;
  let teacherId: number;
  let anotherTeacherId: number;
  let studentId: number;

  beforeAll(async () => {
    // 1. Crear usuario estudiante
    const studentResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ('test-student-get@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Student', 'estudiante')
       RETURNING id`
    );
    studentId = studentResult.rows[0].id;

    // 2. Crear primer profesor
    const teacherResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ('test-teacher-get@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Teacher', 'profesor')
       RETURNING id`
    );
    teacherId = teacherResult.rows[0].id;

    // 3. Crear segundo profesor
    const anotherTeacherResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ('test-teacher2-get@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Another', 'Teacher', 'profesor')
       RETURNING id`
    );
    anotherTeacherId = anotherTeacherResult.rows[0].id;

    // 4. Generar tokens JWT válidos para los tests
    teacherToken = jwt.sign(
      { id: teacherId, email: 'test-teacher-get@example.com', role: 'profesor' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    anotherTeacherToken = jwt.sign(
      { id: anotherTeacherId, email: 'test-teacher2-get@example.com', role: 'profesor' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 5. Crear datos de prueba - study
    const studyResult = await pool.query(
      `INSERT INTO study (student_id, title, description, status)
       VALUES ($1, 'Test Study for Evaluations', 'Test Description', 'pendiente')
       RETURNING id`,
      [studentId]
    );
    testStudyId = studyResult.rows[0].id;

    // Crear evaluaciones de prueba
    const evaluationResult = await pool.query(
      `INSERT INTO evaluation_form (study_id, teacher_id, score, feedback_summary)
       VALUES ($1, $2, 8, 'Buen trabajo en general')
       RETURNING id`,
      [testStudyId, teacherId]
    );
    testEvaluationId = evaluationResult.rows[0].id;

    // Crear otra evaluación para el mismo profesor
    await pool.query(
      `INSERT INTO evaluation_form (study_id, teacher_id, score, feedback_summary)
       VALUES ($1, $2, 9, 'Excelente trabajo')`,
      [testStudyId, teacherId]
    );

    // Crear evaluación para otro profesor (no debe aparecer en las consultas del primer profesor)
    await pool.query(
      `INSERT INTO evaluation_form (study_id, teacher_id, score, feedback_summary)
       VALUES ($1, $2, 7, 'Necesita mejorar')`,
      [testStudyId, anotherTeacherId]
    );
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

  describe('GET /evaluations', () => {
    test('1. Debe obtener todas las evaluaciones del profesor autenticado', async () => {
      const response = await request(baseURL)
        .get('/evaluations')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('evaluations');
      expect(Array.isArray(response.body.evaluations)).toBe(true);
      expect(response.body.evaluations.length).toBeGreaterThanOrEqual(2);

      // Verificar estructura de la respuesta
      const evaluation = response.body.evaluations[0];
      expect(evaluation).toHaveProperty('id');
      expect(evaluation).toHaveProperty('study_id');
      expect(evaluation).toHaveProperty('teacher_id', teacherId);
      expect(evaluation).toHaveProperty('submitted_at');
      expect(evaluation).toHaveProperty('score');
      expect(evaluation).toHaveProperty('feedback_summary');
      expect(evaluation).toHaveProperty('title');
      expect(evaluation).toHaveProperty('created_at');
      expect(evaluation).toHaveProperty('student_first_name');
      expect(evaluation).toHaveProperty('student_last_name');
      expect(evaluation).toHaveProperty('teacher_name');

      // Verificar que todas las evaluaciones pertenecen al profesor autenticado
      response.body.evaluations.forEach((evalItem: any) => {
        expect(evalItem.teacher_id).toBe(teacherId);
      });
    });

    test('2. Debe obtener evaluaciones ordenadas por fecha de envío (DESC)', async () => {
      const response = await request(baseURL)
        .get('/evaluations')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.evaluations.length).toBeGreaterThanOrEqual(2);

      // Verificar orden descendente por submitted_at
      const evaluations = response.body.evaluations;
      for (let i = 0; i < evaluations.length - 1; i++) {
        const currentDate = new Date(evaluations[i].submitted_at);
        const nextDate = new Date(evaluations[i + 1].submitted_at);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
      }
    });

    test('3. Debe filtrar evaluaciones por profesor específico', async () => {
      // Obtener evaluaciones del primer profesor
      const response1 = await request(baseURL)
        .get('/evaluations')
        .set('Authorization', `Bearer ${teacherToken}`);

      // Obtener evaluaciones del segundo profesor
      const response2 = await request(baseURL)
        .get('/evaluations')
        .set('Authorization', `Bearer ${anotherTeacherToken}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Verificar que cada profesor solo ve sus evaluaciones
      response1.body.evaluations.forEach((evalItem: any) => {
        expect(evalItem.teacher_id).toBe(teacherId);
      });

      response2.body.evaluations.forEach((evalItem: any) => {
        expect(evalItem.teacher_id).toBe(anotherTeacherId);
      });

      // Las listas deben ser diferentes
      expect(response1.body.evaluations.length).not.toBe(response2.body.evaluations.length);
    });

    test('4. Debe incluir información completa del estudiante y profesor', async () => {
      const response = await request(baseURL)
        .get('/evaluations')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      
      const evaluation = response.body.evaluations[0];
      
      // Verificar información del estudiante
      expect(evaluation).toHaveProperty('student_first_name');
      expect(evaluation).toHaveProperty('student_last_name');
      expect(typeof evaluation.student_first_name).toBe('string');
      expect(typeof evaluation.student_last_name).toBe('string');

      // Verificar información del profesor
      expect(evaluation).toHaveProperty('teacher_name');
      expect(typeof evaluation.teacher_name).toBe('string');

      // Verificar información del estudio
      expect(evaluation).toHaveProperty('title');
      expect(evaluation).toHaveProperty('created_at');
    });

    test('5. Debe retornar array vacío para profesor sin evaluaciones', async () => {
      // Crear un nuevo profesor sin evaluaciones
      const newTeacherResult = await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, role)
         VALUES ('new-teacher-get@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'New', 'Teacher', 'profesor')
         RETURNING id`
      );
      const newTeacherId = newTeacherResult.rows[0].id;

      const newTeacherToken = jwt.sign(
        { id: newTeacherId, email: 'new-teacher-get@example.com', role: 'profesor' },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(baseURL)
        .get('/evaluations')
        .set('Authorization', `Bearer ${newTeacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        evaluations: []
      });

      // Limpiar el profesor creado
      await pool.query(`DELETE FROM users WHERE id = $1`, [newTeacherId]);
    });

    test('6. Debe manejar token inválido', async () => {
      const response = await request(baseURL)
        .get('/evaluations')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(403);
    });

    test('7. Debe manejar falta de token de autorización', async () => {
      const response = await request(baseURL)
        .get('/evaluations');

      expect(response.status).toBe(401);
    });

    test('8. Debe verificar que el campo score está presente y es válido', async () => {
      const response = await request(baseURL)
        .get('/evaluations')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      
      response.body.evaluations.forEach((evalItem: any) => {
        expect(evalItem).toHaveProperty('score');
        expect(typeof evalItem.score).toBe('number');
        expect(evalItem.score).toBeGreaterThanOrEqual(1);
        expect(evalItem.score).toBeLessThanOrEqual(10);
      });
    });
  });
}); 