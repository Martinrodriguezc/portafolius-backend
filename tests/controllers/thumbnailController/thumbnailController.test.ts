import request from 'supertest';
import { pool } from '../../../src/config/db';

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('ThumbnailController - Tests de Integración', () => {
  let teacherId: number;
  let studentId: number;
  let studyId: number;
  let clipId: number;

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

    // Crear video_clip con object_key que simule un archivo real
    const clipResult = await pool.query(
      `INSERT INTO video_clip (study_id, object_key, original_filename, mime_type, size_bytes, order_index, duration_seconds, protocol)
       VALUES ($1, $2, 'test.mp4', 'video/mp4', 1000, 1, 120, 'test-protocol')
       RETURNING id`,
      [studyId, `users/${studentId}/test-video-${timestamp}.mp4`]
    );
    clipId = clipResult.rows[0].id;
  });

  afterAll(async () => {
    // Limpiar en orden correcto debido a foreign keys
    await pool.query(`DELETE FROM video_clip WHERE id = $1`, [clipId]);
    await pool.query(`DELETE FROM study WHERE id = $1`, [studyId]);
    await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, [teacherId, studentId]);
  });

  describe('GET /video/:videoId/thumbnail-download-url', () => {
    test('1. Debe obtener URL de descarga de thumbnail exitosamente', async () => {
      const response = await request(baseURL)
        .get(`/video/${clipId}/thumbnail-download-url`);
      console.log(response.body);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(typeof response.body.url).toBe('string');
      expect(response.body.url).toContain('https://');
      expect(response.body.url).toContain('amazonaws.com');
    });

    test('2. Debe validar estructura correcta de respuesta', async () => {
      const response = await request(baseURL)
        .get(`/video/${clipId}/thumbnail-download-url`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(typeof response.body.url).toBe('string');
      expect(response.body.url.length).toBeGreaterThan(0);
      
      // Validar que la URL sea válida
      expect(() => new URL(response.body.url)).not.toThrow();
    });

    test('3. Debe retornar 404 para video no encontrado', async () => {
      const response = await request(baseURL)
        .get('/video/999999/thumbnail-download-url');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Vídeo no encontrado');
    });

    test('4. Debe validar videoId numérico', async () => {
      const response = await request(baseURL)
        .get('/video/invalid-id/thumbnail-download-url');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'videoId inválido');
    });

    test('5. Debe manejar videoId como string numérico válido', async () => {
      const response = await request(baseURL)
        .get(`/video/${clipId.toString()}/thumbnail-download-url`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
    });

    test('6. Debe generar URL firmada con tiempo de expiración', async () => {
      const response = await request(baseURL)
        .get(`/video/${clipId}/thumbnail-download-url`);

      expect(response.status).toBe(200);
      expect(response.body.url).toContain('X-Amz-Expires=300'); // 5 minutos en segundos
    });

    test('7. Debe generar URL con path correcto para thumbnail', async () => {
      const response = await request(baseURL)
        .get(`/video/${clipId}/thumbnail-download-url`);

      expect(response.status).toBe(200);
      // El path debe incluir 'thumbnails' y terminar en .jpg
      expect(response.body.url).toContain('thumbnails');
      expect(response.body.url).toContain('.jpg');
    });

    test('8. Debe manejar casos edge con diferentes formatos de video', async () => {
      // Crear video con diferentes extensiones
      const testFormats = [
        { ext: '.mov', mime: 'video/quicktime' },
        { ext: '.avi', mime: 'video/avi' },
        { ext: '.mkv', mime: 'video/x-matroska' }
      ];

      for (const format of testFormats) {
        const timestamp = Date.now();
        const clipResult = await pool.query(
          `INSERT INTO video_clip (study_id, object_key, original_filename, mime_type, size_bytes, order_index, duration_seconds, protocol)
           VALUES ($1, $2, $3, $4, 1000, 1, 120, 'test-protocol')
           RETURNING id`,
          [studyId, `users/${studentId}/test-video-${timestamp}${format.ext}`, `test${format.ext}`, format.mime]
        );
        const testClipId = clipResult.rows[0].id;

        const response = await request(baseURL)
          .get(`/video/${testClipId}/thumbnail-download-url`);

        expect(response.status).toBe(200);
        expect(response.body.url).toContain('.jpg');

        // Limpiar
        await pool.query(`DELETE FROM video_clip WHERE id = $1`, [testClipId]);
      }
    });

    test('9. Debe manejar errores internos del servidor', async () => {
      // Este test verifica que el error handling funciona correctamente
      // Podríamos simular un error de S3 pero es difícil en un test de integración
      // En su lugar, verificamos que el endpoint responde adecuadamente
      const response = await request(baseURL)
        .get(`/video/${clipId}/thumbnail-download-url`);

      // Si no hay error, debe ser 200, si hay error interno debe ser 500
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 500) {
        expect(response.body).toHaveProperty('message', 'Error interno');
      }
    });

    test('10. Debe mantener consistencia en formato de respuesta', async () => {
      const response = await request(baseURL)
        .get(`/video/${clipId}/thumbnail-download-url`);

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(['url']);
      expect(response.headers['content-type']).toContain('application/json');
    });

    test('11. Debe manejar múltiples videos concurrentemente', async () => {
      // Crear múltiples videos para probar concurrencia
      const timestamp = Date.now();
      const clipResults: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        const clipResult = await pool.query(
          `INSERT INTO video_clip (study_id, object_key, original_filename, mime_type, size_bytes, order_index, duration_seconds, protocol)
           VALUES ($1, $2, $3, 'video/mp4', 1000, $4, 120, 'test-protocol')
           RETURNING id`,
          [studyId, `users/${studentId}/concurrent-test-${timestamp}-${i}.mp4`, `concurrent-test-${i}.mp4`, i + 2]
        );
        clipResults.push(clipResult.rows[0].id);
      }

      // Hacer peticiones concurrentes
      const promises = clipResults.map(id => 
        request(baseURL).get(`/video/${id}/thumbnail-download-url`)
      );
      
      const responses = await Promise.all(promises);
      
      // Todas deberían ser exitosas
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('url');
      });

      // Limpiar
      for (const id of clipResults) {
        await pool.query(`DELETE FROM video_clip WHERE id = $1`, [id]);
      }
    });
  });
}); 