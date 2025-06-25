import request from 'supertest';
import { pool } from '../../../src/config/db';
import jwt from 'jsonwebtoken';
import { config } from '../../../src/config';

// Configuración para tests de integración
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('ListEvaluationsByStudent Controller - Tests de Integración', () => {
  let testStudyId1: number;
  let testStudyId2: number;
  let testEvaluationId1: number;
  let testEvaluationId2: number;
  let teacherToken: string;
  let teacherId: number;
  let studentId: number;
  let anotherStudentId: number;

  beforeAll(async () => {
    // 1. Crear primer estudiante
    const studentResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ('test-student-list@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Student', 'estudiante')
       RETURNING id`
    );
    studentId = studentResult.rows[0].id;

    // 2. Crear segundo estudiante
    const anotherStudentResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ('test-student2-list@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Another', 'Student', 'estudiante')
       RETURNING id`
    );
    anotherStudentId = anotherStudentResult.rows[0].id;

    // 3. Crear profesor
    const teacherResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ('test-teacher-list@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Teacher', 'profesor')
       RETURNING id`
    );
    teacherId = teacherResult.rows[0].id;

    // 4. Generar token JWT válido para el profesor
    teacherToken = jwt.sign(
      { id: teacherId, email: 'test-teacher-list@example.com', role: 'profesor' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Crear estudios de prueba para el primer estudiante
    const studyResult1 = await pool.query(
      `INSERT INTO study (student_id, title, description, status)
       VALUES ($1, 'Test Study 1', 'Test Description 1', 'pendiente')
       RETURNING id`,
      [studentId]
    );
    testStudyId1 = studyResult1.rows[0].id;

    const studyResult2 = await pool.query(
      `INSERT INTO study (student_id, title, description, status)
       VALUES ($1, 'Test Study 2', 'Test Description 2', 'pendiente')
       RETURNING id`,
      [studentId]
    );
    testStudyId2 = studyResult2.rows[0].id;

    // Crear evaluaciones para los estudios del primer estudiante
    const evaluationResult1 = await pool.query(
      `INSERT INTO evaluation_form (study_id, teacher_id, score, feedback_summary)
       VALUES ($1, $2, 8, 'Buen trabajo en el primer estudio')
       RETURNING id`,
      [testStudyId1, teacherId]
    );
    testEvaluationId1 = evaluationResult1.rows[0].id;

    const evaluationResult2 = await pool.query(
      `INSERT INTO evaluation_form (study_id, teacher_id, score, feedback_summary)
       VALUES ($1, $2, 9, 'Excelente trabajo en el segundo estudio')
       RETURNING id`,
      [testStudyId2, teacherId]
    );
    testEvaluationId2 = evaluationResult2.rows[0].id;

    // Crear estudio y evaluación para otro estudiante (no debe aparecer en las consultas del primer estudiante)
    const anotherStudyResult = await pool.query(
      `INSERT INTO study (student_id, title, description, status)
       VALUES ($1, 'Another Student Study', 'Another Description', 'pendiente')
       RETURNING id`,
      [anotherStudentId]
    );

    await pool.query(
      `INSERT INTO evaluation_form (study_id, teacher_id, score, feedback_summary)
       VALUES ($1, $2, 7, 'Trabajo del otro estudiante')`,
      [anotherStudyResult.rows[0].id, teacherId]
    );
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await pool.query(
      `DELETE FROM evaluation_form WHERE study_id IN 
       (SELECT id FROM study WHERE student_id IN ($1, $2))`,
      [studentId, anotherStudentId]
    );
    await pool.query(
      `DELETE FROM study WHERE student_id IN ($1, $2)`,
      [studentId, anotherStudentId]
    );
    await pool.query(
      `DELETE FROM users WHERE id IN ($1, $2, $3)`,
      [studentId, anotherStudentId, teacherId]
    );
  });

  describe('GET /evaluations/by-student', () => {
    test('1. Debe obtener todas las evaluaciones de un estudiante específico', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-student?studentId=${studentId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      // Verificar estructura de la respuesta
      const evaluation = response.body[0];
      expect(evaluation).toHaveProperty('id');
      expect(evaluation).toHaveProperty('study_id');
      expect(evaluation).toHaveProperty('submitted_at');
      expect(evaluation).toHaveProperty('score');
      expect(evaluation).toHaveProperty('feedback_summary');

      // Verificar que son las evaluaciones correctas
      const evaluationIds = response.body.map((evalItem: any) => evalItem.id);
      expect(evaluationIds).toContain(testEvaluationId1);
      expect(evaluationIds).toContain(testEvaluationId2);
    });

    test('2. Debe filtrar evaluaciones por estudiante específico', async () => {
      // Obtener evaluaciones del primer estudiante
      const response1 = await request(baseURL)
        .get(`/evaluations/by-student?studentId=${studentId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      // Obtener evaluaciones del segundo estudiante
      const response2 = await request(baseURL)
        .get(`/evaluations/by-student?studentId=${anotherStudentId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      expect(response1.body).toHaveLength(2);
      expect(response2.body).toHaveLength(1);

      // Las evaluaciones deben ser diferentes
      const evaluationIds1 = response1.body.map((evalItem: any) => evalItem.id);
      const evaluationIds2 = response2.body.map((evalItem: any) => evalItem.id);
      
      expect(evaluationIds1).not.toEqual(evaluationIds2);
    });

    test('3. Debe retornar error 400 cuando falta studentId', async () => {
      const response = await request(baseURL)
        .get('/evaluations/by-student')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        msg: 'studentId es requerido'
      });
    });

    test('4. Debe retornar error 400 cuando studentId no es numérico', async () => {
      const response = await request(baseURL)
        .get('/evaluations/by-student?studentId=invalid')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        msg: 'studentId es requerido'
      });
    });

    test('5. Debe retornar array vacío para estudiante sin evaluaciones', async () => {
      const response = await request(baseURL)
        .get('/evaluations/by-student?studentId=999999')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('6. Debe verificar que los scores están en el rango válido', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-student?studentId=${studentId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      
      response.body.forEach((evalItem: any) => {
        expect(evalItem).toHaveProperty('score');
        expect(typeof evalItem.score).toBe('number');
        expect(evalItem.score).toBeGreaterThanOrEqual(1);
        expect(evalItem.score).toBeLessThanOrEqual(10);
      });
    });

    test('7. Debe incluir el feedback_summary en la respuesta', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-student?studentId=${studentId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      
      response.body.forEach((evalItem: any) => {
        expect(evalItem).toHaveProperty('feedback_summary');
        expect(typeof evalItem.feedback_summary).toBe('string');
        expect(evalItem.feedback_summary.length).toBeGreaterThan(0);
      });
    });

    test('8. Debe manejar token inválido', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-student?studentId=${studentId}`)
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(403);
    });

    test('9. Debe manejar falta de token de autorización', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-student?studentId=${studentId}`);

      expect(response.status).toBe(401);
    });

    test('10. Debe verificar que las fechas de envío están presentes', async () => {
      const response = await request(baseURL)
        .get(`/evaluations/by-student?studentId=${studentId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      
      response.body.forEach((evalItem: any) => {
        expect(evalItem).toHaveProperty('submitted_at');
        expect(new Date(evalItem.submitted_at)).toBeInstanceOf(Date);
        expect(new Date(evalItem.submitted_at).getTime()).not.toBeNaN();
      });
    });
  });
}); 