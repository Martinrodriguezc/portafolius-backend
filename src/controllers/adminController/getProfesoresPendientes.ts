import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const getProfesoresPendientes = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT id, email, first_name, last_name, role, created_at FROM users WHERE role = 'profesor' AND autorizado = FALSE"
    );
    logger.info(`Se encontraron ${result.rows.length} profesores pendientes de autorización`);
    res.status(200).json({ profesores: result.rows });
  } catch (error) {
    logger.error("Error al obtener profesores pendientes", { error });
    res.status(500).json({ msg: "Error al obtener profesores pendientes" });
  }
}; 