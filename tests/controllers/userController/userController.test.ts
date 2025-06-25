import request from 'supertest';
import { pool } from '../../../src/config/db';
import jwt from 'jsonwebtoken';
import { config } from '../../../src/config';
import { createUniqueTestData, addTestUserForCleanup } from '../../setup';

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('UserController - Tests de Integración', () => {
  let adminId: number;
  let testUserId: number;
  let testStudentId: number;
  let adminToken: string;
  let studyId: number;
  let testData: ReturnType<typeof createUniqueTestData>;

  beforeAll(async () => {
    testData = createUniqueTestData();
    
    // Crear usuario admin
    const adminResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Admin', 'admin')
       RETURNING id`,
      [`admin_${testData.email}`]
    );
    adminId = adminResult.rows[0].id;
    addTestUserForCleanup(adminId);

    // Crear usuario profesor
    const testUserResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'User', 'profesor')
       RETURNING id`,
      [`profesor_${testData.email}`]
    );
    testUserId = testUserResult.rows[0].id;
    addTestUserForCleanup(testUserId);

    // Crear usuario estudiante para tests
    const studentResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role, created_at)
       VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Student', 'estudiante', NOW())
       RETURNING id`,
      [`estudiante_${testData.email}`]
    );
    testStudentId = studentResult.rows[0].id;
    addTestUserForCleanup(testStudentId);

    // Generar token JWT para admin
    adminToken = jwt.sign(
      { id: adminId, email: `admin_${testData.email}`, role: 'admin' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Crear estudio para el estudiante (para test de last_activity)
    const studyResult = await pool.query(
      `INSERT INTO study (student_id, title, description, status, created_at)
       VALUES ($1, $2, 'Test Description', 'active', NOW())
       RETURNING id`,
      [testStudentId, `${testData.title}`]
    );
    studyId = studyResult.rows[0].id;
  });

  // La limpieza se hace automáticamente con el setup mejorado

  describe('GET /users', () => {
    test('1. Debe obtener lista de usuarios exitosamente', async () => {
      const response = await request(baseURL)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3); // Al menos nuestros 3 usuarios de prueba
    });

    test('2. Debe validar estructura correcta de respuesta', async () => {
      const response = await request(baseURL)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      response.body.forEach((user: any) => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('first_name');
        expect(user).toHaveProperty('last_name');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
        expect(typeof user.id).toBe('number');
        expect(typeof user.first_name).toBe('string');
        expect(typeof user.last_name).toBe('string');
        expect(typeof user.email).toBe('string');
        expect(typeof user.role).toBe('string');
        expect(user.email).toContain('@');
        expect(['admin', 'profesor', 'estudiante','google_login']).toContain(user.role);
      });
    });

    test('3. Debe rechazar sin token de autenticación', async () => {
      const response = await request(baseURL)
        .get('/users');

      expect(response.status).toBe(401);
    });

    test('4. Debe rechazar con token inválido', async () => {
      const response = await request(baseURL)
        .get('/users')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });

    test('5. Debe filtrar por usuario/permisos adecuadamente', async () => {
      const response = await request(baseURL)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // Verificar que no se devuelve información sensible como password
      response.body.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
      });
    });
  });

  describe('GET /users/:id', () => {
    test('1. Debe obtener usuario por ID exitosamente', async () => {
      const response = await request(baseURL)
        .get(`/users/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('first_name');
      expect(response.body).toHaveProperty('last_name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('role');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('last_activity');
      expect(response.body.id).toBe(testStudentId);
    });

    test('2. Debe validar estructura correcta de respuesta individual', async () => {
      const response = await request(baseURL)
        .get(`/users/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(typeof response.body.id).toBe('number');
      expect(typeof response.body.first_name).toBe('string');
      expect(typeof response.body.last_name).toBe('string');
      expect(typeof response.body.email).toBe('string');
      expect(typeof response.body.role).toBe('string');
      expect(response.body.email).toContain('@');
      
      // Validar fechas
      expect(response.body).toHaveProperty('created_at');
      expect(new Date(response.body.created_at)).toBeInstanceOf(Date);
      expect(new Date(response.body.created_at).getTime()).not.toBeNaN();
      
      // last_activity puede ser null para algunos usuarios
      if (response.body.last_activity) {
        expect(new Date(response.body.last_activity)).toBeInstanceOf(Date);
        expect(new Date(response.body.last_activity).getTime()).not.toBeNaN();
      }
    });

    test('3. Debe retornar 404 para usuario no encontrado', async () => {
      const response = await request(baseURL)
        .get('/users/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('msg', 'Usuario no encontrado');
    });

    test('4. Debe rechazar sin token de autenticación', async () => {
      const response = await request(baseURL)
        .get(`/users/${testUserId}`);

      expect(response.status).toBe(401);
    });

    test('5. Debe rechazar con token inválido', async () => {
      const response = await request(baseURL)
        .get(`/users/${testUserId}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });

    test('6. Debe manejar ID inválido', async () => {
      const response = await request(baseURL)
        .get('/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /users/:id', () => {
    test('1. Debe actualizar usuario exitosamente', async () => {
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
        email: `updated-${Date.now()}@example.com`
      };

      const response = await request(baseURL)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('first_name', 'Updated');
      expect(response.body).toHaveProperty('last_name', 'Name');
      expect(response.body).toHaveProperty('email', updateData.email);
    });

    test('2. Debe validar campos requeridos', async () => {
      const response = await request(baseURL)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    test('3. Debe validar formato de email', async () => {
      const response = await request(baseURL)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          first_name: 'Test',
          last_name: 'User',
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
    });

    test('4. Debe retornar 404 para usuario no encontrado', async () => {
      const response = await request(baseURL)
        .put('/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com'
        });

      expect(response.status).toBe(404);
    });

    test('5. Debe rechazar sin token de autenticación', async () => {
      const response = await request(baseURL)
        .put(`/users/${testUserId}`)
        .send({
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com'
        });

      expect(response.status).toBe(401);
    });

    test('6. Debe rechazar con token inválido', async () => {
      const response = await request(baseURL)
        .put(`/users/${testUserId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /users/:id', () => {
    let userToDeleteId: number;

    beforeEach(async () => {
      // Crear usuario para eliminar en cada test
      const timestamp = Date.now();
      const userResult = await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, role)
         VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'To', 'Delete', 'estudiante')
         RETURNING id`,
        [`to-delete-${timestamp}@example.com`]
      );
      userToDeleteId = userResult.rows[0].id;
    });

    test('1. Debe eliminar usuario correctamente', async () => {
      const response = await request(baseURL)
        .delete(`/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('msg', 'Usuario eliminado correctamente');

      // Verificar que el usuario fue eliminado
      const checkResult = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [userToDeleteId]
      );
      expect(checkResult.rows).toHaveLength(0);
    });

    test('2. Debe retornar 404 para usuario no encontrado', async () => {
      const response = await request(baseURL)
        .delete('/users/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('msg', 'Usuario no encontrado');
    });

    test('3. Debe rechazar sin token de autenticación', async () => {
      const response = await request(baseURL)
        .delete(`/users/${userToDeleteId}`);

      expect(response.status).toBe(401);
    });

    test('4. Debe rechazar con token inválido', async () => {
      const response = await request(baseURL)
        .delete(`/users/${userToDeleteId}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });

    test('5. Debe manejar ID inválido', async () => {
      const response = await request(baseURL)
        .delete('/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
    });
  });
}); 