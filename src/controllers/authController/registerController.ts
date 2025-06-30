import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const register = async (req: Request, res: Response): Promise<void> => {
  const firstName = req.body.firstName ?? req.body.first_name;
  const lastName  = req.body.lastName  ?? req.body.last_name;
  const { email, role, password } = req.body;

  if (!firstName || !lastName || !email || !role || !password) {
    logger.warn("No se proporcionaron todos los campos requeridos en el registro");
    res.status(400).json({ msg: "Debe proporcionar todos los campos" });
    return;
  }

  if (role !== "estudiante" && role !== "profesor") {
    logger.warn(`Rol incorrecto: ${role}`);
    res.status(400).json({ msg: "Rol incorrecto" });
    return;
  }

  try {
    const userExists = await pool.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      logger.warn(`El usuario ya existe: ${email}`);
      res.status(400).json({ msg: "El usuario ya existe" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const autorizado = role !== "profesor"; // Solo los profesores tienen autorizado=false inicialmente

    const newUser = await pool.query(
      `INSERT INTO users
          (first_name, last_name, email, role, password, autorizado)
       VALUES
          ($1,          $2,        $3,    $4,   $5,       $6)
       RETURNING id, email, first_name, last_name, role, autorizado, created_at`,
      [firstName, lastName, email, role, hashedPassword, autorizado]
    );

    logger.info(`Usuario registrado correctamente: ${email}`);
    res.status(201).json({
      msg: "Usuario registrado correctamente",
      user: newUser.rows[0],
    });
  } catch (error) {
    logger.error("Error al registrar el usuario", { error });
    res.status(500).json({ msg: "Error al registrar el usuario" });
  }
};