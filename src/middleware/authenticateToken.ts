// src/middleware/authenticateToken.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import logger from "../config/logger";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {                           // <-- especificamos que retorna `void`
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Token de autorización no proporcionado o mal formado");
    res.status(401).json({ msg: "No autorizado, token no proporcionado o mal formado" });
    return;                          // <-- no devolvemos el `Response`, solo cortamos
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (err) {
      logger.error("Error de verificación del token", { error: err });
      res.status(403).json({ msg: "Token inválido o expirado" });
      return;
    }
    req.user = decoded;
    logger.info("Token verificado correctamente", { user: decoded });
    next();
  });
};