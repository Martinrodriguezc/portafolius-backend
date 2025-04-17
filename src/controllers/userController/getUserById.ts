import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT id, first_name, last_name, email, role FROM Users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      logger.warn(`Usuario no encontrado con ID: ${id}`);
      res.status(404).json({ msg: "Usuario no encontrado" });
      return;
    }

    logger.info(`Usuario recuperado exitosamente: ${id}`);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error(`Error al obtener usuario con ID: ${id}`, { error });
    res.status(500).json({ msg: "Error al obtener usuario" });
  }
}; 