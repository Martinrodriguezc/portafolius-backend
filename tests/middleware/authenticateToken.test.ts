// Test de middleware que SÍ ejecuta código real para cobertura
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../src/middleware/authenticateToken';

// Mock solo las dependencias externas
jest.mock('jsonwebtoken');
jest.mock('../../src/config/logger');

// Importar y configurar mocks después de los jest.mock
import jwt from 'jsonwebtoken';
import logger from '../../src/config/logger';

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock del config
jest.mock('../../src/config', () => ({
  config: {
    JWT_SECRET: 'test-jwt-secret-key',
    NODE_ENV: 'test'
  }
}));

describe('AuthenticateToken Middleware - Real Code Coverage', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      headers: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('Validación de token', () => {
    test('Debe retornar 401 cuando no hay header Authorization', () => {
      mockReq.headers = {};

      // EJECUTA EL CÓDIGO REAL DEL MIDDLEWARE
      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: "No autorizado, token no proporcionado o mal formado"
      });
      expect(mockLogger.warn).toHaveBeenCalledWith("Token de autorización no proporcionado o mal formado");
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Debe retornar 401 cuando el header no empieza con Bearer', () => {
      mockReq.headers = {
        authorization: 'Basic sometoken'
      };

      // EJECUTA EL CÓDIGO REAL DEL MIDDLEWARE
      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: "No autorizado, token no proporcionado o mal formado"
      });
      expect(mockLogger.warn).toHaveBeenCalledWith("Token de autorización no proporcionado o mal formado");
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Debe retornar 401 cuando solo hay "Bearer " sin token', () => {
      mockReq.headers = {
        authorization: 'Bearer '
      };

      // Mock jwt.verify para simular error con token vacío
      mockJwt.verify = jest.fn().mockImplementation((token, secret, callback) => {
        callback(new Error('Empty token'), null);
      });

      // EJECUTA EL CÓDIGO REAL DEL MIDDLEWARE
      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      // El split[1] de "Bearer " devuelve "", así que jwt.verify será llamado con ""
      expect(mockJwt.verify).toHaveBeenCalledWith(
        '',
        'test-jwt-secret-key',
        expect.any(Function)
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: "Token inválido o expirado"
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Verificación JWT', () => {
    test('Debe retornar 403 cuando el token es inválido', () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token'
      };

      // Mock jwt.verify para simular error
      mockJwt.verify = jest.fn().mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      // EJECUTA EL CÓDIGO REAL DEL MIDDLEWARE
      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith(
        'invalid-token',
        'test-jwt-secret-key',
        expect.any(Function)
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: "Token inválido o expirado"
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error de verificación del token",
        { error: expect.any(Error) }
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Debe permitir acceso con token válido', () => {
      const validToken = 'valid-jwt-token';
      const decodedUser = {
        id: 1,
        email: 'test@example.com',
        role: 'estudiante'
      };

      mockReq.headers = {
        authorization: `Bearer ${validToken}`
      };

      // Mock jwt.verify para simular éxito
      mockJwt.verify = jest.fn().mockImplementation((token, secret, callback) => {
        callback(null, decodedUser);
      });

      // EJECUTA EL CÓDIGO REAL DEL MIDDLEWARE
      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith(
        validToken,
        'test-jwt-secret-key',
        expect.any(Function)
      );
      expect(mockReq.user).toEqual(decodedUser);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Token verificado correctamente",
        { user: decodedUser }
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('Debe manejar diferentes tipos de usuarios correctamente', () => {
      const validToken = 'valid-teacher-token';
      const teacherUser = {
        id: 2,
        email: 'teacher@example.com',
        role: 'profesor'
      };

      mockReq.headers = {
        authorization: `Bearer ${validToken}`
      };

      mockJwt.verify = jest.fn().mockImplementation((token, secret, callback) => {
        callback(null, teacherUser);
      });

      // EJECUTA EL CÓDIGO REAL DEL MIDDLEWARE
      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(teacherUser);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Casos edge', () => {
    test('Debe manejar token con espacios extra', () => {
      const validToken = 'token-with-spaces';
      const decodedUser = { id: 1, email: 'test@example.com', role: 'estudiante' };

      mockReq.headers = {
        authorization: `Bearer  ${validToken}  ` // Espacios extra
      };

      mockJwt.verify = jest.fn().mockImplementation((token, secret, callback) => {
        callback(null, decodedUser);
      });

      // EJECUTA EL CÓDIGO REAL DEL MIDDLEWARE
      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      // El split(' ')[1] del string "Bearer  token-with-spaces  " devuelve ""
      // porque hay espacios extra entre Bearer y el token
      expect(mockJwt.verify).toHaveBeenCalledWith(
        '', // El split[1] devuelve string vacía debido a los espacios extra
        'test-jwt-secret-key',
        expect.any(Function)
      );
    });

    test('Debe manejar errores de JWT con diferentes tipos', () => {
      const tokenExpiredError = new Error('TokenExpiredError');
      tokenExpiredError.name = 'TokenExpiredError';

      mockReq.headers = {
        authorization: 'Bearer expired-token'
      };

      mockJwt.verify = jest.fn().mockImplementation((token, secret, callback) => {
        callback(tokenExpiredError, null);
      });

      // EJECUTA EL CÓDIGO REAL DEL MIDDLEWARE
      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error de verificación del token",
        { error: tokenExpiredError }
      );
    });
  });
}); 