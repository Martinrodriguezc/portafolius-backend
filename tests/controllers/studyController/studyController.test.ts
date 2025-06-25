import request from 'supertest';
import { pool } from '../../../src/config/db';
import jwt from 'jsonwebtoken';
import { config } from '../../../src/config';
import { createUniqueTestData, addTestUserForCleanup, addTestStudyForCleanup } from '../../setup';

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('StudyController - Tests de Integración', () => {
  let teacherId: number;
  let studentId: number;
  let teacherToken: string;
  let studentToken: string;
  let studyId: number;
  let videoClipId: number;
  let evaluationFormId: number;
  let testData: ReturnType<typeof createUniqueTestData>;

  beforeAll(async () => {
    testData = createUniqueTestData();
    
    // Crear usuario profesor
    const teacherResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Teacher', 'profesor')
       RETURNING id`,
      [`teacher_${testData.email}`]
    );
    teacherId = teacherResult.rows[0].id;
    addTestUserForCleanup(teacherId);

    // Crear usuario estudiante
    const studentResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Student', 'estudiante')
       RETURNING id`,
      [`student_${testData.email}`]
    );
    studentId = studentResult.rows[0].id;
    addTestUserForCleanup(studentId);

    // Generar tokens JWT
    teacherToken = jwt.sign(
      { id: teacherId, email: `teacher_${testData.email}`, role: 'profesor' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    studentToken = jwt.sign(
      { id: studentId, email: `student_${testData.email}`, role: 'estudiante' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Crear estudio
    const studyResult = await pool.query(
      `INSERT INTO study (student_id, title, description, status)
       VALUES ($1, $2, 'Test Description', 'active')
       RETURNING id`,
      [studentId, testData.title]
    );
    studyId = studyResult.rows[0].id;
    addTestStudyForCleanup(studyId);

    // Crear video_clip
    const clipResult = await pool.query(
      `INSERT INTO video_clip (study_id, object_key, original_filename, mime_type, size_bytes, order_index, protocol)
       VALUES ($1, $2, 'test.mp4', 'video/mp4', 1000, 1, $3)
       RETURNING id`,
      [studyId, `test-key-${testData.timestamp}`, 'protocolo-test']
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
  });

  // La limpieza se hace automáticamente con el setup mejorado

  describe('GET /study/:userId', () => {
    test('1. Debe obtener estudios del estudiante exitosamente', async () => {
      const response = await request(baseURL)
        .get(`/study/${studentId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('studies');
      expect(Array.isArray(response.body.studies)).toBe(true);
      expect(response.body.studies.length).toBeGreaterThanOrEqual(1);

    });

    test('2. Debe validar estructura de estudios', async () => {
      const response = await request(baseURL)
        .get(`/study/${studentId}`);

      expect(response.status).toBe(200);
      
      response.body.studies.forEach((study: any) => {
        expect(study).toHaveProperty('id');
        expect(study).toHaveProperty('title');
        expect(study).toHaveProperty('description');
        expect(study).toHaveProperty('status');
        expect(study).toHaveProperty('created_at');
        expect(study).toHaveProperty('has_evaluation');
        expect(study).toHaveProperty('score');
        expect(Number.isInteger(Number(study.id))).toBe(true);
        expect(typeof study.title).toBe('string');
        expect(typeof study.description).toBe('string');
        expect(typeof study.status).toBe('string');
        expect(typeof study.has_evaluation).toBe('boolean');
      });
    });

    test('3. Debe validar ID de estudiante inválido', async () => {
      const response = await request(baseURL)
        .get('/study/invalid');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('msg');
      expect(response.body.msg).toBe('ID de estudiante inválido');
    });

    test('4. Debe verificar ordenamiento por fecha de creación descendente', async () => {
      const response = await request(baseURL)
        .get(`/study/${studentId}`);

      expect(response.status).toBe(200);
      
      if (response.body.studies.length > 1) {
        for (let i = 0; i < response.body.studies.length - 1; i++) {
          const currentDate = new Date(response.body.studies[i].created_at);
          const nextDate = new Date(response.body.studies[i + 1].created_at);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });

    test('5. Debe incluir evaluaciones cuando existen', async () => {
      const response = await request(baseURL)
        .get(`/study/${studentId}`);

      expect(response.status).toBe(200);
      
      const testStudy = response.body.studies.find((s: any) => s.id === studyId);
      expect(testStudy).toBeDefined();
      expect(testStudy.has_evaluation).toBe(true);
      expect(testStudy.score).toBe(8);
    });

    test('6. Debe retornar array vacío para estudiante sin estudios', async () => {
      // Crear estudiante sin estudios
      const timestamp = Date.now();
      const newStudentResult = await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, role)
         VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'New', 'Student', 'estudiante')
         RETURNING id`,
        [`test-new-student-${timestamp}@example.com`]
      );
      const newStudentId = newStudentResult.rows[0].id;

      const response = await request(baseURL)
        .get(`/study/${newStudentId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('studies');
      expect(Array.isArray(response.body.studies)).toBe(true);
      expect(response.body.studies).toHaveLength(0);

      // Limpiar
      await pool.query(`DELETE FROM users WHERE id = $1`, [newStudentId]);
    });

    test('7. Debe validar fechas como objetos Date válidos', async () => {
      const response = await request(baseURL)
        .get(`/study/${studentId}`);

      expect(response.status).toBe(200);
      
      response.body.studies.forEach((study: any) => {
        expect(study).toHaveProperty('created_at');
        expect(new Date(study.created_at)).toBeInstanceOf(Date);
        expect(new Date(study.created_at).getTime()).not.toBeNaN();
      });
    });
  });

  describe('POST /study/:userId/studies', () => {
    test('8. Debe crear estudio exitosamente', async () => {
      const studyData = {
        title: 'New Test Study',
        description: 'New test study description'
      };

      const response = await request(baseURL)
        .post(`/study/${studentId}/studies`)
        .send(studyData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('study');
      expect(response.body.study).toHaveProperty('id');
      expect(response.body.study).toHaveProperty('title');
      expect(response.body.study).toHaveProperty('description');
      expect(response.body.study).toHaveProperty('status');
      expect(response.body.study).toHaveProperty('created_at');
      expect(response.body.study.title).toBe(studyData.title);
      expect(response.body.study.description).toBe(studyData.description);
      expect(response.body.study.status).toBe('pendiente');
      expect(response.body.study.student_id).toBe(studentId);

      // Verificar en base de datos
      const dbResult = await pool.query(
        `SELECT * FROM study WHERE id = $1`,
        [response.body.study.id]
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].title).toBe(studyData.title);

      // Limpiar
      await pool.query(`DELETE FROM study WHERE id = $1`, [response.body.study.id]);
    });

    test('9. Debe validar campos requeridos', async () => {
      const response = await request(baseURL)
        .post(`/study/${studentId}/studies`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('msg');
      expect(response.body.msg).toBe('Debe proporcionar titulo, descripción y fecha');
    });

    test('10. Debe validar title requerido', async () => {
      const studyData = {
        description: 'Test description'
      };

      const response = await request(baseURL)
        .post(`/study/${studentId}/studies`)
        .send(studyData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('msg');
      expect(response.body.msg).toBe('Debe proporcionar titulo, descripción y fecha');
    });

    test('11. Debe validar description requerido', async () => {
      const studyData = {
        title: 'Test title'
      };

      const response = await request(baseURL)
        .post(`/study/${studentId}/studies`)
        .send(studyData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('msg');
      expect(response.body.msg).toBe('Debe proporcionar titulo, descripción y fecha');
    });

    test('12. Debe establecer status por defecto como pendiente', async () => {
      const studyData = {
        title: 'Test Default Status',
        description: 'Test description'
      };

      const response = await request(baseURL)
        .post(`/study/${studentId}/studies`)
        .send(studyData);

      expect(response.status).toBe(201);
      expect(response.body.study.status).toBe('pendiente');

      // Limpiar
      await pool.query(`DELETE FROM study WHERE id = $1`, [response.body.study.id]);
    });

    test('13. Debe validar ID de usuario numérico', async () => {
      const studyData = {
        title: 'Test Study',
        description: 'Test description'
      };

      const response = await request(baseURL)
        .post('/study/invalid/studies')
        .send(studyData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('msg');
    });
  });

  describe('GET /study/teacher/study-with-status', () => {
    test('14. Debe obtener todos los estudios con información de evaluación', async () => {
      const response = await request(baseURL)
        .get('/study/teacher/study-with-status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('studies');
      expect(Array.isArray(response.body.studies)).toBe(true);
      expect(response.body.studies.length).toBeGreaterThanOrEqual(1);
    });

    test('15. Debe validar estructura completa de estudios con info de estudiante', async () => {
      const response = await request(baseURL)
        .get('/study/teacher/study-with-status');

      expect(response.status).toBe(200);
      
      response.body.studies.forEach((study: any) => {
        expect(study).toHaveProperty('study_id');
        expect(study).toHaveProperty('title');
        expect(study).toHaveProperty('description');
        expect(study).toHaveProperty('status');
        expect(study).toHaveProperty('created_at');
        expect(study).toHaveProperty('first_name');
        expect(study).toHaveProperty('last_name');
        expect(study).toHaveProperty('email');
        expect(study).toHaveProperty('has_evaluation');
        expect(study).toHaveProperty('score');
        expect(Number.isInteger(Number(study.study_id))).toBe(true);
        expect(typeof study.first_name).toBe('string');
        expect(typeof study.last_name).toBe('string');
        expect(typeof study.email).toBe('string');
        expect(typeof study.has_evaluation).toBe('boolean');
      });
    });

    test('16. Debe verificar ordenamiento por fecha de creación descendente', async () => {
      const response = await request(baseURL)
        .get('/study/teacher/study-with-status');

      expect(response.status).toBe(200);
      
      if (response.body.studies.length > 1) {
        for (let i = 0; i < response.body.studies.length - 1; i++) {
          const currentDate = new Date(response.body.studies[i].created_at);
          const nextDate = new Date(response.body.studies[i + 1].created_at);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });

    test('17. Debe incluir información del estudiante', async () => {
      const response = await request(baseURL)
        .get('/study/teacher/study-with-status');

      expect(response.status).toBe(200);
      
      const testStudy = response.body.studies.find((s: any) => s.study_id === studyId);
      expect(testStudy).toBeDefined();
      expect(testStudy.first_name).toBe('Test');
      expect(testStudy.last_name).toBe('Student');
      expect(testStudy.email).toContain('@example.com');
    });
  });

  describe('GET /study/:studyId/videos', () => {
    test('18. Debe obtener videos del estudio exitosamente', async () => {
      const response = await request(baseURL)
        .get(`/study/${studyId}/videos`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('clips');
      expect(Array.isArray(response.body.clips)).toBe(true);
      expect(response.body.clips.length).toBeGreaterThanOrEqual(1);
    });

    test('19. Debe validar estructura de clips de video', async () => {
      const response = await request(baseURL)
        .get(`/study/${studyId}/videos`);

      expect(response.status).toBe(200);
      
      response.body.clips.forEach((clip: any) => {
        expect(clip).toHaveProperty('id');
        expect(clip).toHaveProperty('study_id');
        expect(clip).toHaveProperty('object_key');
        expect(clip).toHaveProperty('original_filename');
        expect(clip).toHaveProperty('mime_type');
        expect(clip).toHaveProperty('size_bytes');
        expect(clip).toHaveProperty('upload_date');
        expect(clip).toHaveProperty('order_index');
        expect(clip).toHaveProperty('status');
        expect(Number.isInteger(Number(clip.id))).toBe(true);
        expect(Number.isInteger(Number(clip.study_id))).toBe(true);
        expect(typeof clip.object_key).toBe('string');
        expect(typeof clip.original_filename).toBe('string');
        expect(typeof clip.mime_type).toBe('string');
        expect(typeof clip.size_bytes).toBe('string');
        expect(Number.isInteger(Number(clip.size_bytes))).toBe(true);
        expect(Number.isInteger(Number(clip.order_index))).toBe(true);
      });
    });

    test('20. Debe verificar ordenamiento por order_index', async () => {
      const response = await request(baseURL)
        .get(`/study/${studyId}/videos`);

      expect(response.status).toBe(200);
      
      if (response.body.clips.length > 1) {
        for (let i = 0; i < response.body.clips.length - 1; i++) {
          const currentOrderIndex = response.body.clips[i].order_index;
          const nextOrderIndex = response.body.clips[i + 1].order_index;
          expect(currentOrderIndex).toBeLessThanOrEqual(nextOrderIndex);
        }
      }
    });

    test('21. Debe retornar array vacío para estudio sin videos', async () => {
      // Crear estudio sin videos
      const timestamp = Date.now();
      const newStudyResult = await pool.query(
        `INSERT INTO study (student_id, title, description, status)
         VALUES ($1, $2, 'Test Description', 'active')
         RETURNING id`,
        [studentId, `Test Study No Videos - ${timestamp}`]
      );
      const newStudyId = newStudyResult.rows[0].id;

      const response = await request(baseURL)
        .get(`/study/${newStudyId}/videos`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('clips');
      expect(Array.isArray(response.body.clips)).toBe(true);
      expect(response.body.clips).toHaveLength(0);

      // Limpiar
      await pool.query(`DELETE FROM study WHERE id = $1`, [newStudyId]);
    });

    test('22. Debe validar ID de estudio numérico', async () => {
      const response = await request(baseURL)
        .get('/study/invalid/videos');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('msg');
    });

    test('23. Debe incluir información de duración si está disponible', async () => {
      const response = await request(baseURL)
        .get(`/study/${studyId}/videos`);

      expect(response.status).toBe(200);
      
      response.body.clips.forEach((clip: any) => {
        expect(clip).toHaveProperty('duration_seconds');
        // duration_seconds puede ser null o number
        if (clip.duration_seconds !== null) {
          expect(Number.isInteger(Number(clip.duration_seconds)) || typeof clip.duration_seconds === 'number').toBe(true);
        }
      });
    });
  });

  describe('GET /study/:userId/comments', () => {

    test('24. Debe validar estructura de comentarios', async () => {
      const response = await request(baseURL)
        .get(`/study/${studentId}/comments`);

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
        expect(typeof comment.date).toBe('string');
        expect(Number.isInteger(Number(comment.studyId))).toBe(true);
        expect(Number.isInteger(Number(comment.videoId))).toBe(true);
      });
    });

    test('25. Debe limitar comentarios a máximo 50', async () => {
      const response = await request(baseURL)
        .get(`/study/${studentId}/comments`);

      expect(response.status).toBe(200);
      expect(response.body.comments.length).toBeLessThanOrEqual(50);
    });

    test('26. Debe excluir comentarios del propio estudiante', async () => {
      const response = await request(baseURL)
        .get(`/study/${studentId}/comments`);

      expect(response.status).toBe(200);
      
      // Todos los comentarios deben ser de otros usuarios (profesores)
      response.body.comments.forEach((comment: any) => {
        expect(comment.author).not.toBe('Test Student');
        expect(comment.author).toBe('Test Teacher');
      });
    });

    test('27. Debe verificar ordenamiento por fecha descendente', async () => {
      const response = await request(baseURL)
        .get(`/study/${studentId}/comments`);

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
  });
}); 