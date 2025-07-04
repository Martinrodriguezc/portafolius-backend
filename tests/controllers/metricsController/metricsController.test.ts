import request from 'supertest';
import { pool } from '../../../src/config/db';
import jwt from 'jsonwebtoken';
import { config } from '../../../src/config';
import { createUniqueTestData } from '../../setup';

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('MetricsController - Tests de Integración', () => {
  let teacherId: number;
  let studentId: number;
  let teacherToken: string;
  let studyId: number;
  let videoClipId: number;
  let evaluationFormId: number;
  let protocolId: number;

  beforeAll(async () => {
    const testData = createUniqueTestData();
    
    // Crear usuario profesor
    const teacherResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Teacher', 'profesor')
       RETURNING id`,
      [`test-teacher-${testData.timestamp}-${testData.random}@example.com`]
    );
    teacherId = teacherResult.rows[0].id;

    // Crear usuario estudiante
    const studentResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Student', 'estudiante')
       RETURNING id`,
      [`test-student-${testData.timestamp}-${testData.random}@example.com`]
    );
    studentId = studentResult.rows[0].id;

    // Generar token JWT para profesor
    teacherToken = jwt.sign(
      { id: teacherId, email: `test-teacher-${testData.timestamp}-${testData.random}@example.com`, role: 'profesor' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Crear estudio
    const studyResult = await pool.query(
      `INSERT INTO study (student_id, title, description, status)
       VALUES ($1, $2, 'Test Description', 'active')
       RETURNING id`,
      [studentId, `Test Study - ${testData.timestamp}-${testData.random}`]
    );
    studyId = studyResult.rows[0].id;

    // Crear protocolo
    const protocolResult = await pool.query(
      `INSERT INTO protocol (key, name)
       VALUES ($1, 'Test Protocol')
       RETURNING id`,
      [`test_protocol_${testData.timestamp}_${testData.random}`]
    );
    protocolId = protocolResult.rows[0].id;

    // Crear video_clip
    const clipResult = await pool.query(
      `INSERT INTO video_clip (study_id, object_key, original_filename, mime_type, size_bytes, order_index, protocol)
       VALUES ($1, $2, 'test.mp4', 'video/mp4', 1000, 1, $3)
       RETURNING id`,
      [studyId, `test-key-${testData.timestamp}-${testData.random}`, `test_protocol_${testData.timestamp}_${testData.random}`]
    );
    videoClipId = clipResult.rows[0].id;

    // Crear evaluation_form
    const evaluationResult = await pool.query(
      `INSERT INTO evaluation_form (study_id, teacher_id, score, feedback_summary, submitted_at)
       VALUES ($1, $2, 8, 'Test feedback', NOW())
       RETURNING id`,
      [studyId, teacherId]
    );
    evaluationFormId = evaluationResult.rows[0].id;

    // Crear comentario
    await pool.query(
      `INSERT INTO clip_comment (clip_id, user_id, comment_text, timestamp)
       VALUES ($1, $2, 'Test comment', NOW())`,
      [videoClipId, teacherId]
    );

    // Crear tag
    const tagResult = await pool.query(
      `INSERT INTO tag (name)
       VALUES ('Test Tag')
       RETURNING id`
    );
    const tagId = tagResult.rows[0].id;

    // Crear clip_tag
    await pool.query(
      `INSERT INTO clip_tag (clip_id, tag_id, assigned_by)
       VALUES ($1, $2, $3)`,
      [videoClipId, tagId, teacherId]
    );
  });

  afterAll(async () => {
    // Limpiar en orden correcto
    await pool.query(`DELETE FROM clip_tag WHERE clip_id = $1`, [videoClipId]);
    await pool.query(`DELETE FROM tag WHERE name = 'Test Tag'`);
    await pool.query(`DELETE FROM clip_comment WHERE clip_id = $1`, [videoClipId]);
    await pool.query(`DELETE FROM evaluation_form WHERE id = $1`, [evaluationFormId]);
    await pool.query(`DELETE FROM video_clip WHERE id = $1`, [videoClipId]);
    await pool.query(`DELETE FROM study WHERE id = $1`, [studyId]);
    await pool.query(`DELETE FROM protocol WHERE id = $1`, [protocolId]);
    await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, [teacherId, studentId]);
  });

  describe('GET /metrics/:id/dashboard-metrics', () => {
    test('1. Debe obtener métricas del dashboard del estudiante exitosamente', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/dashboard-metrics`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('monthlyScores');
      expect(response.body).toHaveProperty('monthlyStudies');
      expect(response.body).toHaveProperty('monthlyVideos');
      expect(response.body).toHaveProperty('monthlyComments');
      expect(response.body).toHaveProperty('topStudies');
      expect(response.body).toHaveProperty('bottomStudies');
      expect(response.body).toHaveProperty('evaluations');
      expect(response.body).toHaveProperty('tagScores');
      expect(response.body).toHaveProperty('protocolCounts');
    });

    test('2. Debe validar estructura de monthlyScores', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/dashboard-metrics`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.monthlyScores)).toBe(true);
      
      response.body.monthlyScores.forEach((item: any) => {
        expect(item).toHaveProperty('mes');
        expect(item).toHaveProperty('average_score');
        expect(typeof item.mes).toBe('string');
        expect(Number.isInteger(Number(item.average_score)) || typeof item.average_score === 'number').toBe(true);
      });
    });

    test('3. Debe validar estructura de monthlyStudies', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/dashboard-metrics`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.monthlyStudies)).toBe(true);
      expect(response.body.monthlyStudies.length).toBeGreaterThanOrEqual(1);
      
      response.body.monthlyStudies.forEach((item: any) => {
        expect(item).toHaveProperty('mes');
        expect(item).toHaveProperty('studies_count');
        expect(typeof item.mes).toBe('string');
        expect(Number.isInteger(Number(item.studies_count))).toBe(true);
        expect(Number(item.studies_count)).toBeGreaterThan(0);
      });
    });

    test('4. Debe validar estructura de topStudies', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/dashboard-metrics`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.topStudies)).toBe(true);
      
      response.body.topStudies.forEach((study: any) => {
        expect(study).toHaveProperty('study_id');
        expect(study).toHaveProperty('title');
        expect(study).toHaveProperty('score');
        expect(Number.isInteger(Number(study.study_id))).toBe(true);
        expect(typeof study.title).toBe('string');
        expect(Number.isInteger(Number(study.score)) || typeof study.score === 'number').toBe(true);
        expect(study.score).toBeGreaterThanOrEqual(1);
        expect(study.score).toBeLessThanOrEqual(10);
      });
    });

    test('5. Debe validar estructura de evaluations', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/dashboard-metrics`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.evaluations)).toBe(true);
      expect(response.body.evaluations.length).toBeGreaterThanOrEqual(1);
      
      response.body.evaluations.forEach((evalItem: any) => {
        expect(evalItem).toHaveProperty('submitted_at');
        expect(evalItem).toHaveProperty('score');
        expect(new Date(evalItem.submitted_at)).toBeInstanceOf(Date);
        expect(new Date(evalItem.submitted_at).getTime()).not.toBeNaN();
        expect(Number.isInteger(Number(evalItem.score)) || typeof evalItem.score === 'number').toBe(true);
        expect(evalItem.score).toBeGreaterThanOrEqual(1);
        expect(evalItem.score).toBeLessThanOrEqual(10);
      });
    });

    test('6. Debe validar ordenamiento de evaluations por fecha', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/dashboard-metrics`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      
      if (response.body.evaluations.length > 1) {
        for (let i = 0; i < response.body.evaluations.length - 1; i++) {
          const currentDate = new Date(response.body.evaluations[i].submitted_at);
          const nextDate = new Date(response.body.evaluations[i + 1].submitted_at);
          expect(currentDate.getTime()).toBeLessThanOrEqual(nextDate.getTime());
        }
      }
    });

    test('7. Debe validar estructura de protocolCounts', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/dashboard-metrics`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.protocolCounts)).toBe(true);
      
      response.body.protocolCounts.forEach((protocol: any) => {
        expect(protocol).toHaveProperty('protocol');
        expect(protocol).toHaveProperty('count');
        expect(Number.isInteger(Number(protocol.count))).toBe(true);
        expect(Number(protocol.count)).toBeGreaterThan(0);
      });
    });

    test('8. Debe rechazar solicitud sin token de autenticación', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/dashboard-metrics`);

      expect(response.status).toBe(401);
    });

    test('9. Debe rechazar token inválido', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/dashboard-metrics`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });

    test('10. Debe manejar estudiante sin datos', async () => {
      // Crear estudiante sin datos
      const timestamp = Date.now();
      const newStudentResult = await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, role)
         VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'New', 'Student', 'estudiante')
         RETURNING id`,
        [`test-new-student-${timestamp}@example.com`]
      );
      const newStudentId = newStudentResult.rows[0].id;

      const response = await request(baseURL)
        .get(`/metrics/${newStudentId}/dashboard-metrics`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.monthlyScores)).toBe(true);
      expect(response.body.monthlyScores).toHaveLength(0);
      expect(Array.isArray(response.body.monthlyStudies)).toBe(true);
      expect(response.body.monthlyStudies).toHaveLength(0);

      // Limpiar
      await pool.query(`DELETE FROM users WHERE id = $1`, [newStudentId]);
    });
  });

  describe('GET /metrics/:id/student-stats', () => {
    test('11. Debe obtener estadísticas del estudiante exitosamente', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/student-stats`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('protocolCounts');
      expect(Array.isArray(response.body.protocolCounts)).toBe(true);
    });

    test('12. Debe validar estructura de protocolCounts en stats', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/student-stats`);

      expect(response.status).toBe(200);
      
      response.body.protocolCounts.forEach((protocol: any) => {
        expect(protocol).toHaveProperty('protocol');
        expect(protocol).toHaveProperty('count');
        expect(Number.isInteger(Number(protocol.count))).toBe(true);
        expect(Number(protocol.count)).toBeGreaterThan(0);
      });
    });

    test('13. Debe manejar estudiante sin protocolos', async () => {
      // Crear estudiante sin protocolos
      const timestamp = Date.now();
      const newStudentResult = await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, role)
         VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'New', 'Student', 'estudiante')
         RETURNING id`,
        [`test-new-student-${timestamp}@example.com`]
      );
      const newStudentId = newStudentResult.rows[0].id;

      const response = await request(baseURL)
        .get(`/metrics/${newStudentId}/student-stats`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('protocolCounts');
      expect(Array.isArray(response.body.protocolCounts)).toBe(true);
      expect(response.body.protocolCounts).toHaveLength(0);

      // Limpiar
      await pool.query(`DELETE FROM users WHERE id = $1`, [newStudentId]);
    });

    test('14. Debe manejar ID de estudiante inexistente', async () => {
      const response = await request(baseURL)
        .get('/metrics/99999/student-stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('protocolCounts');
      expect(Array.isArray(response.body.protocolCounts)).toBe(true);
      expect(response.body.protocolCounts).toHaveLength(0);
    });

    test('15. Debe funcionar sin autenticación', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/student-stats`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('protocolCounts');
    });
  });

  describe('GET /metrics/:id/comments', () => {
    test('16. Debe obtener comentarios recientes exitosamente', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/comments`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('comments');
      expect(Array.isArray(response.body.comments)).toBe(true);
      expect(response.body.comments.length).toBeGreaterThanOrEqual(1);
    });

    test('17. Debe validar estructura de comentarios', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/comments`);

      expect(response.status).toBe(200);
      
      response.body.comments.forEach((comment: any) => {
        expect(comment).toHaveProperty('id');
        expect(comment).toHaveProperty('text');
        expect(comment).toHaveProperty('author');
        expect(comment).toHaveProperty('date');
        expect(comment).toHaveProperty('studyId');
        expect(comment).toHaveProperty('videoId');
        expect(Number.isInteger(Number(comment.id))).toBe(true);
        expect(typeof comment.text).toBe('string');
        expect(typeof comment.author).toBe('string');
        expect(Number.isInteger(Number(comment.studyId))).toBe(true);
        expect(Number.isInteger(Number(comment.videoId))).toBe(true);
      });
    });

    test('18. Debe verificar ordenamiento de comentarios por fecha descendente', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/comments`);

      expect(response.status).toBe(200);
      
      if (response.body.comments.length > 1) {
        // Los comentarios deben estar ordenados por timestamp DESC
        for (let i = 0; i < response.body.comments.length - 1; i++) {
          const currentComment = response.body.comments[i];
          const nextComment = response.body.comments[i + 1];
          expect(currentComment.id).toBeGreaterThanOrEqual(nextComment.id);
        }
      }
    });

    test('19. Debe retornar array vacío para estudiante sin comentarios', async () => {
      // Crear estudiante sin comentarios
      const timestamp = Date.now();
      const newStudentResult = await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, role)
         VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'New', 'Student', 'estudiante')
         RETURNING id`,
        [`test-new-student-${timestamp}@example.com`]
      );
      const newStudentId = newStudentResult.rows[0].id;

      const response = await request(baseURL)
        .get(`/metrics/${newStudentId}/comments`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('comments');
      expect(Array.isArray(response.body.comments)).toBe(true);
      expect(response.body.comments).toHaveLength(0);

      // Limpiar
      await pool.query(`DELETE FROM users WHERE id = $1`, [newStudentId]);
    });

    test('20. Debe limitar comentarios a máximo 50', async () => {
      const response = await request(baseURL)
        .get(`/metrics/${studentId}/comments`);

      expect(response.status).toBe(200);
      expect(response.body.comments.length).toBeLessThanOrEqual(50);
    });
  });
}); 