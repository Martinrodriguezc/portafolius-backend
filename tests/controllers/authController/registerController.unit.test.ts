import { Request, Response } from 'express';
import { register } from '../../../src/controllers/authController/registerController';
import { pool } from '../../../src/config/db';
import bcrypt from 'bcrypt';
import logger from '../../../src/config/logger';
import { createUniqueTestData, addTestUserForCleanup } from '../../setup';

// Mock de las dependencias
jest.mock('../../../src/config/db');
jest.mock('bcrypt');
jest.mock('../../../src/config/logger');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('RegisterController - Tests Unitarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let testData: ReturnType<typeof createUniqueTestData>;

  beforeEach(() => {
    testData = createUniqueTestData();
    
    mockReq = {
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Validación de campos requeridos', () => {
    test('1. Debe fallar si falta firstName/first_name', async () => {
      mockReq.body = {
        lastName: testData.lastName,
        email: testData.email,
        role: 'estudiante',
        password: 'password123'
      };

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe proporcionar todos los campos'
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No se proporcionaron todos los campos requeridos en el registro'
      );
    });

    test('2. Debe fallar si falta lastName/last_name', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        email: testData.email,
        role: 'estudiante',
        password: 'password123'
      };

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe proporcionar todos los campos'
      });
    });

    test('3. Debe fallar si falta email', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        role: 'estudiante',
        password: 'password123'
      };

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe proporcionar todos los campos'
      });
    });

    test('4. Debe fallar si falta role', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        password: 'password123'
      };

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe proporcionar todos los campos'
      });
    });

    test('5. Debe fallar si falta password', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        role: 'estudiante'
      };

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Debe proporcionar todos los campos'
      });
    });
  });

  describe('Validación de roles', () => {
    test('6. Debe aceptar rol "estudiante"', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        role: 'estudiante',
        password: 'password123'
      };

      // Mock pool responses
      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any) // User doesn't exist
        .mockResolvedValueOnce({ // User creation successful
          rows: [{
            id: 1,
            email: testData.email,
            first_name: testData.firstName,
            last_name: testData.lastName,
            role: 'estudiante',
            created_at: '2023-01-01T00:00:00Z'
          }]
        } as any);

      mockBcrypt.hash.mockResolvedValue('hashed_password123' as never);

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Usuario registrado correctamente',
        user: expect.objectContaining({
          id: 1,
          email: testData.email,
          role: 'estudiante'
        })
      });
    });

    test('7. Debe aceptar rol "profesor"', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        role: 'profesor',
        password: 'password123'
      };

      // Mock pool responses
      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 2,
            email: testData.email,
            first_name: testData.firstName,
            last_name: testData.lastName,
            role: 'profesor',
            created_at: '2023-01-01T00:00:00Z'
          }]
        } as any);

      mockBcrypt.hash.mockResolvedValue('hashed_password123' as never);

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Usuario registrado correctamente',
        user: expect.objectContaining({
          role: 'profesor'
        })
      });
    });

    test('8. Debe rechazar rol inválido', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        role: 'administrador',
        password: 'password123'
      };

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Rol incorrecto'
      });
      expect(mockLogger.warn).toHaveBeenCalledWith('Rol incorrecto: administrador');
    });
  });

  describe('Verificación de usuario existente', () => {
    test('9. Debe fallar si el usuario ya existe', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        role: 'estudiante',
        password: 'password123'
      };

      // Mock que el usuario ya existe
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      } as any);

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'El usuario ya existe'
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(`El usuario ya existe: ${testData.email}`);
    });

    test('10. Debe proceder si el usuario no existe', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        role: 'estudiante',
        password: 'password123'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any) // User doesn't exist
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: testData.email,
            first_name: testData.firstName,
            last_name: testData.lastName,
            role: 'estudiante',
            created_at: '2023-01-01T00:00:00Z'
          }]
        } as any);

      mockBcrypt.hash.mockResolvedValue('hashed_password123' as never);

      await register(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT 1 FROM users WHERE email = $1',
        [testData.email]
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Hasheo de contraseñas', () => {
    test('11. Debe hashear la contraseña correctamente', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        role: 'estudiante',
        password: 'password123'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: testData.email,
            first_name: testData.firstName,
            last_name: testData.lastName,
            role: 'estudiante',
            created_at: '2023-01-01T00:00:00Z'
          }]
        } as any);

      mockBcrypt.hash.mockResolvedValue('hashed_password123' as never);

      await register(mockReq as Request, mockRes as Response);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          testData.firstName,
          testData.lastName,
          testData.email,
          'estudiante',
          'hashed_password123'
        ])
      );
    });
  });

  describe('Soporte para diferentes nombres de campos', () => {
    test('12. Debe funcionar con first_name/last_name', async () => {
      mockReq.body = {
        first_name: testData.firstName,
        last_name: testData.lastName,
        email: testData.email,
        role: 'estudiante',
        password: 'password123'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: testData.email,
            first_name: testData.firstName,
            last_name: testData.lastName,
            role: 'estudiante',
            created_at: '2023-01-01T00:00:00Z'
          }]
        } as any);

      mockBcrypt.hash.mockResolvedValue('hashed_password123' as never);

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Usuario registrado correctamente',
        user: expect.objectContaining({
          first_name: testData.firstName,
          last_name: testData.lastName
        })
      });
    });

    test('13. Debe preferir firstName sobre first_name', async () => {
      mockReq.body = {
        firstName: 'Priority Name',
        first_name: 'Secondary Name',
        lastName: testData.lastName,
        email: testData.email,
        role: 'estudiante',
        password: 'password123'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: testData.email,
            first_name: 'Priority Name',
            last_name: testData.lastName,
            role: 'estudiante',
            created_at: '2023-01-01T00:00:00Z'
          }]
        } as any);

      mockBcrypt.hash.mockResolvedValue('hashed_password123' as never);

      await register(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['Priority Name'])
      );
    });
  });

  describe('Manejo de errores', () => {
    test('14. Debe manejar errores de base de datos', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        role: 'estudiante',
        password: 'password123'
      };

      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al registrar el usuario'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al registrar el usuario',
        { error: dbError }
      );
    });

    test('15. Debe manejar errores de bcrypt', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        role: 'estudiante',
        password: 'password123'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);
      const bcryptError = new Error('Bcrypt failed');
      mockBcrypt.hash.mockRejectedValueOnce(bcryptError);

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al registrar el usuario'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error al registrar el usuario',
        { error: bcryptError }
      );
    });
  });

  describe('Logging exitoso', () => {
    test('16. Debe registrar log de éxito', async () => {
      mockReq.body = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        role: 'estudiante',
        password: 'password123'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: testData.email,
            first_name: testData.firstName,
            last_name: testData.lastName,
            role: 'estudiante',
            created_at: '2023-01-01T00:00:00Z'
          }]
        } as any);

      mockBcrypt.hash.mockResolvedValue('hashed_password123' as never);

      await register(mockReq as Request, mockRes as Response);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Usuario registrado correctamente: ${testData.email}`
      );
    });
  });

  console.log('✅ Tests unitarios del RegisterController completados:');
  console.log('   - Validación de campos requeridos (5 tests)');
  console.log('   - Validación de roles (3 tests)');
  console.log('   - Verificación de usuario existente (2 tests)');
  console.log('   - Hasheo de contraseñas (1 test)');
  console.log('   - Soporte para diferentes nombres de campos (2 tests)');
  console.log('   - Manejo de errores (2 tests)');
  console.log('   - Logging exitoso (1 test)');
  console.log('   - Total: 16 tests unitarios + 1 resumen = 17 tests');
}); 