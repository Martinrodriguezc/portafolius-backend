import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../config/db";
import logger from "../../config/logger";
import { AuthenticatedRequest } from "../../middleware/authenticateToken";

export interface UserFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
}

interface RequestPayload {
  user: {
    id: number;
    email: string;
    role: string;
  };
  newUser: UserFormData;
}

export const createUserByAdmin = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as RequestPayload;
  
  if (!payload.user || !payload.newUser) {
    logger.warn("Formato de petición inválido");
    res.status(400).json({ msg: "Formato de petición inválido" });
    return;
  }

  if (payload.user.role !== 'admin') {
    logger.warn(`Acceso denegado: usuario no es administrador. User ID: ${payload.user.id}`);
    res.status(403).json({ msg: "Acceso denegado. Solo administradores pueden crear usuarios." });
    return;
  }

  const userData = payload.newUser;

  if (!userData.first_name || !userData.last_name || !userData.email || !userData.role || !userData.password) {
    logger.warn("No se proporcionaron todos los campos requeridos para crear usuario");
    res.status(400).json({ msg: "Debe proporcionar todos los campos" });
    return;
  }

  if (!['profesor', 'estudiante', 'admin'].includes(userData.role)) {
    logger.warn(`Rol incorrecto proporcionado: ${userData.role}`);
    res.status(400).json({ msg: "Rol no válido. Los roles permitidos son: profesor, estudiante, admin" });
    return;
  }

  try {
    const userExists = await pool.query(
      "SELECT 1 FROM users WHERE email = $1",
      [userData.email]
    );

    if (userExists.rows.length > 0) {
      logger.warn(`El usuario ya existe: ${userData.email}`);
      res.status(400).json({ msg: "El usuario ya existe" });
      return;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser = await pool.query(
      `INSERT INTO users
          (first_name, last_name, email, role, password)
       VALUES
          ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [userData.first_name, userData.last_name, userData.email, userData.role, hashedPassword]
    );

    logger.info(`Usuario creado por administrador: ${userData.email}, rol: ${userData.role}`);
    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    logger.error("Error al crear el usuario por administrador", { error });
    res.status(500).json({ msg: "Error al crear el usuario" });
  }
}; 