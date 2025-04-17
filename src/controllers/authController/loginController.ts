import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db";
import { config } from "../../config";
import logger from "../../config/logger";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    logger.warn("Debe proporcionar email y contraseña en login");
    res.status(400).json({ msg: "Debe proporcionar email y contraseña" });
    return;
  }

  try {
    const result = await pool.query("SELECT * FROM Users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      logger.warn(`No se encontró usuario para email: ${email}`);
      res.status(401).json({ msg: "Correo inválido" });
      return;
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      logger.warn(`Contraseña incorrecta para email: ${email}`);
      res.status(401).json({ msg: "Contraseña incorrecta" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info(`Inicio de sesión exitoso para email: ${email}`);
    res.status(200).json({
      msg: "Inicio de sesión exitoso",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (error) {
    logger.error("Error en login:", { error });
    res.status(500).json({ msg: "Error al iniciar sesión" });
  }
}; 