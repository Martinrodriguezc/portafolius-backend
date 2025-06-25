import request from 'supertest';
import { pool } from '../../../src/config/db';
import jwt from 'jsonwebtoken';
import { config } from '../../../src/config';

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('ProtocolController - Tests de Integración', () => {
  let teacherId: number;
  let teacherToken: string;
  let protocolId: number;
  let protocolKey: string;
  let sectionId: number;
  let itemId: number;

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

    // Generar token JWT para profesor
    teacherToken = jwt.sign(
      { id: teacherId, email: `test-teacher-${timestamp}@example.com`, role: 'profesor' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Crear protocolo de prueba
    protocolKey = `test_protocol_${timestamp}`;
    const protocolResult = await pool.query(
      `INSERT INTO protocol (key, name)
       VALUES ($1, 'Test Protocol')
       RETURNING id`,
      [protocolKey]
    );
    protocolId = protocolResult.rows[0].id;

    // Crear sección de protocolo
    const sectionResult = await pool.query(
      `INSERT INTO protocol_section (protocol_id, key, name, sort_order)
       VALUES ($1, 'test_section', 'Test Section', 1)
       RETURNING id`,
      [protocolId]
    );
    sectionId = sectionResult.rows[0].id;

    // Crear item de protocolo
    const itemResult = await pool.query(
      `INSERT INTO protocol_item (section_id, key, label, score_scale, max_score)
       VALUES ($1, 'test_item', 'Test Item', '1-10', 10)
       RETURNING id`,
      [sectionId]
    );
    itemId = itemResult.rows[0].id;
  });

  afterAll(async () => {
    // Limpiar en orden correcto
    await pool.query(`DELETE FROM protocol_item WHERE id = $1`, [itemId]);
    await pool.query(`DELETE FROM protocol_section WHERE id = $1`, [sectionId]);
    await pool.query(`DELETE FROM protocol WHERE id = $1`, [protocolId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [teacherId]);
  });

  describe('GET /protocols', () => {
    test('1. Debe obtener todos los protocolos exitosamente', async () => {
      const response = await request(baseURL)
        .get('/protocols');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      
      response.body.forEach((protocol: any) => {
        expect(protocol).toHaveProperty('id');
        expect(protocol).toHaveProperty('key');
        expect(protocol).toHaveProperty('name');
        expect(Number.isInteger(Number(protocol.id))).toBe(true);
        expect(typeof protocol.key).toBe('string');
        expect(typeof protocol.name).toBe('string');
      });
    });

    test('2. Debe verificar ordenamiento por nombre', async () => {
      const response = await request(baseURL)
        .get('/protocols');

      expect(response.status).toBe(200);
      
      if (response.body.length > 1) {
        for (let i = 0; i < response.body.length - 1; i++) {
          const currentName = response.body[i].name.toLowerCase();
          const nextName = response.body[i + 1].name.toLowerCase();
          expect(currentName.localeCompare(nextName)).toBeLessThanOrEqual(0);
        }
      }
    });

    test('3. Debe funcionar sin autenticación', async () => {
      const response = await request(baseURL)
        .get('/protocols');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('4. Debe incluir el protocolo de prueba creado', async () => {
      const response = await request(baseURL)
        .get('/protocols');

      expect(response.status).toBe(200);
      
      const testProtocol = response.body.find((p: any) => p.key === protocolKey);
      expect(testProtocol).toBeDefined();
      expect(testProtocol.name).toBe('Test Protocol');
    });
  });

  describe('GET /protocols/:key', () => {
    test('5. Debe obtener protocolo específico por key exitosamente', async () => {
      const response = await request(baseURL)
        .get(`/protocols/${protocolKey}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('key');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('sections');
      expect(response.body.key).toBe(protocolKey);
      expect(response.body.name).toBe('Test Protocol');
      expect(Array.isArray(response.body.sections)).toBe(true);
    });

    test('6. Debe validar estructura de secciones', async () => {
      const response = await request(baseURL)
        .get(`/protocols/${protocolKey}`);

      expect(response.status).toBe(200);
      expect(response.body.sections.length).toBeGreaterThanOrEqual(1);
      
      response.body.sections.forEach((section: any) => {
        expect(section).toHaveProperty('key');
        expect(section).toHaveProperty('name');
        expect(section).toHaveProperty('items');
        expect(typeof section.key).toBe('string');
        expect(typeof section.name).toBe('string');
        expect(Array.isArray(section.items)).toBe(true);
      });
    });

    test('7. Debe validar estructura de items en secciones', async () => {
      const response = await request(baseURL)
        .get(`/protocols/${protocolKey}`);

      expect(response.status).toBe(200);
      
      response.body.sections.forEach((section: any) => {
        section.items.forEach((item: any) => {
          expect(item).toHaveProperty('key');
          expect(item).toHaveProperty('label');
          expect(item).toHaveProperty('score_scale');
          expect(item).toHaveProperty('max_score');
          expect(typeof item.key).toBe('string');
          expect(typeof item.label).toBe('string');
          expect(typeof item.score_scale).toBe('string');
          expect(Number.isInteger(Number(item.max_score))).toBe(true);
          expect(item.max_score).toBeGreaterThan(0);
        });
      });
    });

    test('8. Debe retornar 404 para protocolo no encontrado', async () => {
      const response = await request(baseURL)
        .get('/protocols/non_existent_protocol');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('msg');
      expect(response.body.msg).toBe('Protocolo no encontrado');
    });

    test('9. Debe verificar ordenamiento de secciones por sort_order', async () => {
      const response = await request(baseURL)
        .get(`/protocols/${protocolKey}`);

      expect(response.status).toBe(200);
      
      if (response.body.sections.length > 1) {
        // Las secciones deben estar ordenadas por sort_order
        for (let i = 0; i < response.body.sections.length - 1; i++) {
          const currentSection = response.body.sections[i];
          const nextSection = response.body.sections[i + 1];
          expect(currentSection.sort_order).toBeLessThanOrEqual(nextSection.sort_order);
        }
      }
    });

    test('10. Debe verificar ordenamiento de items por id', async () => {
      const response = await request(baseURL)
        .get(`/protocols/${protocolKey}`);

      expect(response.status).toBe(200);
      
      response.body.sections.forEach((section: any) => {
        if (section.items.length > 1) {
          // Los items deben estar ordenados por id
          for (let i = 0; i < section.items.length - 1; i++) {
            const currentItem = section.items[i];
            const nextItem = section.items[i + 1];
            expect(currentItem.id).toBeLessThanOrEqual(nextItem.id);
          }
        }
      });
    });

    test('11. Debe funcionar sin autenticación', async () => {
      const response = await request(baseURL)
        .get(`/protocols/${protocolKey}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('key');
    });
  });

  describe('POST /protocols', () => {
    test('12. Debe crear protocolo exitosamente', async () => {
      const protocolData = {
        name: 'New Test Protocol'
      };

      const response = await request(baseURL)
        .post('/protocols')
        .send(protocolData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('key');
      expect(response.body).toHaveProperty('name');
      expect(Number.isInteger(Number(response.body.id))).toBe(true);
      expect(typeof response.body.key).toBe('string');
      expect(response.body.name).toBe(protocolData.name);

      // Verificar que el key se generó correctamente
      expect(response.body.key).toBe('new_test_protocol');

      // Verificar en base de datos
      const dbResult = await pool.query(
        `SELECT * FROM protocol WHERE id = $1`,
        [response.body.id]
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].name).toBe(protocolData.name);

      // Limpiar
      await pool.query(`DELETE FROM protocol WHERE id = $1`, [response.body.id]);
    });

    test('13. Debe validar campo name requerido', async () => {
      const response = await request(baseURL)
        .post('/protocols')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('El nombre del protocolo es requerido');
    });

    test('14. Debe validar name como string no vacío', async () => {
      const response = await request(baseURL)
        .post('/protocols')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('El nombre del protocolo es requerido');
    });

    test('15. Debe validar name como string válido', async () => {
      const response = await request(baseURL)
        .post('/protocols')
        .send({ name: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('El nombre del protocolo es requerido');
    });

    test('16. Debe rechazar protocolo duplicado', async () => {
      const protocolData = {
        name: 'Test Protocol' // Mismo nombre que el protocolo existente
      };

      const response = await request(baseURL)
        .post('/protocols')
        .send(protocolData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Protocolo ya existe');
    });

    test('17. Debe limpiar y normalizar el nombre', async () => {
      const protocolData = {
        name: '  Test Protocol with Spaces  '
      };

      const response = await request(baseURL)
        .post('/protocols')
        .send(protocolData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Protocol with Spaces');
      expect(response.body.key).toBe('test_protocol_with_spaces');

      // Limpiar
      await pool.query(`DELETE FROM protocol WHERE id = $1`, [response.body.id]);
    });

    test('18. Debe generar key correctamente desde nombre con caracteres especiales', async () => {
      const protocolData = {
        name: 'Protocolo con Ñ y Acentós!'
      };

      const response = await request(baseURL)
        .post('/protocols')
        .send(protocolData);

      expect(response.status).toBe(201);
      expect(response.body.key).toBe('protocolo_con_n_y_acentos');

      // Limpiar
      await pool.query(`DELETE FROM protocol WHERE id = $1`, [response.body.id]);
    });

    test('19. Debe funcionar sin autenticación', async () => {
      const protocolData = {
        name: 'Public Protocol Test'
      };

      const response = await request(baseURL)
        .post('/protocols')
        .send(protocolData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');

      // Limpiar
      await pool.query(`DELETE FROM protocol WHERE id = $1`, [response.body.id]);
    });

  });
}); 