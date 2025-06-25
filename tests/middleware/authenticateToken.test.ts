// Test de middleware que SÍ ejecuta código real para cobertura
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../src/middleware/authenticateToken';

// Mock solo las dependencias externas
jest.mock('jsonwebtoken');
jest.mock('../../src/config');
jest.mock('../../src/config/logger');

import jwt from 'jsonwebtoken';
const mockJwt = jwt as jest.Mocked<typeof jwt>;

const mockLogger = {
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
};

const mockConfig = {
  JWT_SECRET: 'test-secret-key'
};

// Configurar mocks
jest.doMock('../../src/config/logger', () => ({
  default: mockLogger
}));

jest.doMock('../../src/config', () => ({
  config: mockConfig
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
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Debe retornar 401 cuando solo hay "Bearer " sin token', () => {
      mockReq.headers = {
        authorization: 'Bearer '
      };

      // EJECUTA EL CÓDIGO REAL DEL MIDDLEWARE
      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
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
        'test-secret-key',
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
        'test-secret-key',
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

      // Debe extraer el token correctamente (sin espacios)
      expect(mockJwt.verify).toHaveBeenCalledWith(
        `${validToken}  `, // El split toma todo después del primer espacio
        'test-secret-key',
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