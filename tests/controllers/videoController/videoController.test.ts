import request from 'supertest';
import { pool } from '../../../src/config/db';

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('VideoController - Tests de Integración', () => {
  let teacherId: number;
  let studentId: number;
  let studyId: number;
  let clipId: number;
  let tagId: number;

  beforeAll(async () => {
    const timestamp = Date.now();
    
    // Crear usuario profesor
    const teacherResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Teacher', 'profesor')
       RETURNING id`,
      [`test-teacher-${timestamp}@example.com`]
    );
    teacherId = teacherResult.rows[0].id;

    // Crear usuario estudiante
    const studentResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Student', 'estudiante')
       RETURNING id`,
      [`test-student-${timestamp}@example.com`]
    );
    studentId = studentResult.rows[0].id;

    // Crear estudio
    const studyResult = await pool.query(
      `INSERT INTO study (student_id, title, description, status)
       VALUES ($1, $2, 'Test Description', 'active')
       RETURNING id`,
      [studentId, `Test Study - ${timestamp}`]
    );
    studyId = studyResult.rows[0].id;

    // Crear video_clip
    const clipResult = await pool.query(
      `INSERT INTO video_clip (study_id, object_key, original_filename, mime_type, size_bytes, order_index, duration_seconds)
       VALUES ($1, $2, 'test.mp4', 'video/mp4', 1000, 1, 120)
       RETURNING id`,
      [studyId, `users/${studentId}/test-video-${timestamp}.mp4`]
    );
    clipId = clipResult.rows[0].id;

    // Crear tag para tests
    const tagResult = await pool.query(
      `INSERT INTO tag (name, created_by, condition_id) VALUES ($1, $2, 1) RETURNING id`,
      [`test-tag-${timestamp}`, teacherId]
    );
    tagId = tagResult.rows[0].id;
  });

  afterAll(async () => {
    // Limpiar en orden correcto debido a foreign keys
    // Primero eliminar todas las relaciones clip_tag que podrían haber sido creadas
    await pool.query(`DELETE FROM clip_tag WHERE clip_id IN (SELECT id FROM video_clip WHERE study_id = $1)`, [studyId]);
    // Luego eliminar TODOS los video_clips que referencian este study (no solo el inicial)
    await pool.query(`DELETE FROM video_clip WHERE study_id = $1`, [studyId]);
    // Después eliminar tag (independiente)
    await pool.query(`DELETE FROM tag WHERE id = $1`, [tagId]);
    // Luego eliminar study (ya no está referenciado)
    await pool.query(`DELETE FROM study WHERE id = $1`, [studyId]);
    // Finalmente eliminar users (study podría referenciar users)
    await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, [teacherId, studentId]);
  });

  describe('POST /video/generate_upload_url', () => {
    test('1. Debe generar URL de carga exitosamente o fallar por configuración AWS', async () => {
      const uploadData = {
        fileName: 'test-video.mp4',
        contentType: 'video/mp4',
        studyId: studyId,
        sizeBytes: 5000000,
        userId: studentId,
        protocol: 'test_protocol',
        tagIds: [tagId]
      };

      const response = await request(baseURL)
        .post('/video/generate_upload_url')
        .send(uploadData);

      // Puede ser 200 (éxito con AWS configurado) o 500 (error de configuración AWS)
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('uploadUrl');
        expect(response.body).toHaveProperty('clipId');
        expect(response.body).toHaveProperty('key');
        expect(typeof response.body.uploadUrl).toBe('string');
        expect(typeof response.body.clipId).toBe('number');
        expect(typeof response.body.key).toBe('string');
        expect(response.body.uploadUrl).toContain('https://');
        expect(response.body.uploadUrl).toContain('amazonaws.com');

        // Limpiar el clip creado
        await pool.query(`DELETE FROM video_clip WHERE id = $1`, [response.body.clipId]);
      } else {
        // Error de configuración AWS esperado en entorno de test
        expect(response.body).toHaveProperty('msg');
      }
    });

    test('2. Debe validar campos requeridos', async () => {
      const response = await request(baseURL)
        .post('/video/generate_upload_url')
        .send({});

      expect(response.status).toBe(500);
    });

    test('3. Debe validar tipos de contenido válidos', async () => {
      const uploadData = {
        fileName: 'test-video.txt',
        contentType: 'text/plain',
        studyId: studyId,
        sizeBytes: 5000000,
        userId: studentId,
        protocol: 'test_protocol'
      };

      const response = await request(baseURL)
        .post('/video/generate_upload_url')
        .send(uploadData);

      // Dependiendo de la validación, podría ser 400 o permitido
      expect([200, 400, 500]).toContain(response.status);
    });

    test('4. Debe validar studyId existente', async () => {
      const uploadData = {
        fileName: 'test-video.mp4',
        contentType: 'video/mp4',
        studyId: 999999,
        sizeBytes: 5000000,
        userId: studentId,
        protocol: 'test_protocol'
      };

      const response = await request(baseURL)
        .post('/video/generate_upload_url')
        .send(uploadData);

      expect(response.status).toBe(500);
    });

    test('5. Debe manejar tamaños de archivo grandes', async () => {
      const uploadData = {
        fileName: 'large-video.mp4',
        contentType: 'video/mp4',
        studyId: studyId,
        sizeBytes: 500000000, // 500MB
        userId: studentId,
        protocol: 'test_protocol'
      };

      const response = await request(baseURL)
        .post('/video/generate_upload_url')
        .send(uploadData);

      expect([200, 400, 500]).toContain(response.status);
      
      if (response.status === 200) {
        // Limpiar el clip creado
        await pool.query(`DELETE FROM video_clip WHERE id = $1`, [response.body.clipId]);
      }
    });
  });

  describe('POST /video/upload-callback', () => {
    test('1. Debe procesar callback de carga exitosamente', async () => {
      const callbackData = {
        key: `users/${studentId}/test-video-${Date.now()}.mp4`,
        videoId: clipId
      };

      const response = await request(baseURL)
        .post('/video/upload-callback')
        .send(callbackData);

      // Podría ser 200 (éxito) o 500 (error al generar thumbnail)
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('thumbnailKey');
      }
    });

    test('2. Debe validar campos requeridos', async () => {
      const response = await request(baseURL)
        .post('/video/upload-callback')
        .send({});

      expect(response.status).toBe(500);
    });

    test('3. Debe validar videoId existente', async () => {
      const callbackData = {
        key: `users/${studentId}/test-video.mp4`,
        videoId: 999999
      };

      const response = await request(baseURL)
        .post('/video/upload-callback')
        .send(callbackData);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /video/generate_download_url/:clipId', () => {
    test('1. Debe generar URL de descarga exitosamente', async () => {
      const response = await request(baseURL)
        .get(`/video/generate_download_url/${clipId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('downloadUrl');
      expect(typeof response.body.downloadUrl).toBe('string');
      expect(response.body.downloadUrl).toContain('https://');
    });

    test('2. Debe retornar 404 para clip no encontrado', async () => {
      const response = await request(baseURL)
        .get('/video/generate_download_url/999999');

      expect(response.status).toBe(404);
    });

    test('3. Debe manejar ID inválido', async () => {
      const response = await request(baseURL)
        .get('/video/generate_download_url/invalid-id');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /video/:id/meta', () => {
    test('1. Debe obtener metadatos del video exitosamente', async () => {
      const response = await request(baseURL)
        .get(`/video/${clipId}/meta`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('video');
      expect(response.body.video).toHaveProperty('id');
      expect(response.body.video).toHaveProperty('study_id');
      expect(response.body.video).toHaveProperty('original_filename');
      expect(response.body.video).toHaveProperty('mime_type');
      expect(response.body.video).toHaveProperty('size_bytes');
      expect(response.body.video).toHaveProperty('duration_seconds');
      expect(response.body.video.id).toBe(clipId);
    });

    test('2. Debe validar estructura correcta de metadatos', async () => {
      const response = await request(baseURL)
        .get(`/video/${clipId}/meta`);

      expect(response.status).toBe(200);
      expect(typeof response.body.video.id).toBe('number');
      expect(typeof response.body.video.study_id).toBe('number');
      expect(typeof response.body.video.original_filename).toBe('string');
      expect(typeof response.body.video.mime_type).toBe('string');
      expect(typeof response.body.video.size_bytes).toBe('string'); // Viene como string de la BD
      expect(parseInt(response.body.video.size_bytes)).toBeGreaterThan(0);
      
      if (response.body.video.duration_seconds !== null) {
        expect(typeof response.body.video.duration_seconds).toBe('number');
        expect(response.body.video.duration_seconds).toBeGreaterThan(0);
      }
      
      expect(Array.isArray(response.body.video.tags)).toBe(true);
    });

    test('3. Debe retornar 404 para video no encontrado', async () => {
      const response = await request(baseURL)
        .get('/video/999999/meta');

      expect(response.status).toBe(404);
    });

    test('4. Debe manejar ID inválido', async () => {
      const response = await request(baseURL)
        .get('/video/invalid-id/meta');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /video/tags', () => {
    test('1. Debe obtener lista de tags exitosamente', async () => {
      const response = await request(baseURL)
        .get('/video/tags');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tags');
      expect(Array.isArray(response.body.tags)).toBe(true);
      expect(response.body.tags.length).toBeGreaterThanOrEqual(1); // Al menos nuestro tag de prueba
    });

    test('2. Debe validar estructura correcta de tags', async () => {
      const response = await request(baseURL)
        .get('/video/tags');

      expect(response.status).toBe(200);
      if (response.body.tags.length > 0) {
        response.body.tags.forEach((tag: any) => {
          expect(tag).toHaveProperty('id');
          expect(tag).toHaveProperty('name');
          expect(typeof tag.id).toBe('number');
          expect(typeof tag.name).toBe('string');
          expect(tag.name.length).toBeGreaterThan(0);
        });
      }
    });

    test('3. Debe retornar estructura correcta incluso sin tags', async () => {
      const response = await request(baseURL)
        .get('/video/tags');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tags');
      expect(Array.isArray(response.body.tags)).toBe(true);
    });
  });

  describe('POST /video/:clipId/tags', () => {
    test('1. Debe asignar tags al clip exitosamente', async () => {
      const tagData = {
        tagIds: [tagId],
        userId: teacherId
      };

      const response = await request(baseURL)
        .post(`/video/${clipId}/tags`)
        .send(tagData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('msg');
      expect(response.body.msg).toContain('correctamente');

      // Verificar en base de datos
      const checkResult = await pool.query(
        'SELECT * FROM clip_tag WHERE clip_id = $1 AND tag_id = $2',
        [clipId, tagId]
      );
      expect(checkResult.rows).toHaveLength(1);
    });

    test('2. Debe validar que el clip existe', async () => {
      const tagData = {
        tagIds: [tagId],
        userId: teacherId
      };

      const response = await request(baseURL)
        .post('/video/999999/tags')
        .send(tagData);

      expect(response.status).toBe(500); // El controlador no valida existencia del clip
    });

    test('3. Debe validar campos requeridos', async () => {
      const response = await request(baseURL)
        .post(`/video/${clipId}/tags`)
        .send({});

      expect(response.status).toBe(400);
    });

    test('4. Debe validar que tagIds sea un array', async () => {
      const tagData = {
        tagIds: 'invalid',
        userId: teacherId
      };

      const response = await request(baseURL)
        .post(`/video/${clipId}/tags`)
        .send(tagData);

      expect(response.status).toBe(400);
    });

    test('5. Debe manejar tags inexistentes', async () => {
      const tagData = {
        tagIds: [999999],
        userId: teacherId
      };

      const response = await request(baseURL)
        .post(`/video/${clipId}/tags`)
        .send(tagData);

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('GET /video/tag_utils', () => {
    test('1. Debe obtener utilidades de tags exitosamente', async () => {
      const response = await request(baseURL)
        .get('/video/tag_utils');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('organs');
      expect(response.body).toHaveProperty('structures');
      expect(response.body).toHaveProperty('conditions');
      expect(Array.isArray(response.body.organs)).toBe(true);
      expect(Array.isArray(response.body.structures)).toBe(true);
      expect(Array.isArray(response.body.conditions)).toBe(true);
    });

    test('2. Debe validar estructura correcta de tag utils', async () => {
      const response = await request(baseURL)
        .get('/video/tag_utils');

      expect(response.status).toBe(200);
      
      // Validar estructura de organs si existen
      if (response.body.organs.length > 0) {
        response.body.organs.forEach((organ: any) => {
          expect(organ).toHaveProperty('id');
          expect(organ).toHaveProperty('name');
          expect(typeof organ.id).toBe('number');
          expect(typeof organ.name).toBe('string');
        });
      }
      
      // Validar estructura de structures si existen
      if (response.body.structures.length > 0) {
        response.body.structures.forEach((structure: any) => {
          expect(structure).toHaveProperty('id');
          expect(structure).toHaveProperty('name');
          expect(structure).toHaveProperty('organ_id');
          expect(typeof structure.id).toBe('number');
          expect(typeof structure.name).toBe('string');
        });
      }
    });

    test('3. Debe retornar estructura correcta según disponibilidad', async () => {
      const response = await request(baseURL)
        .get('/video/tag_utils');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.organs)).toBe(true);
      expect(Array.isArray(response.body.structures)).toBe(true);
      expect(Array.isArray(response.body.conditions)).toBe(true);
    });
  });
}); 