import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT id, first_name, last_name, email, role FROM Users"
    );

    logger.info("Lista de usuarios recuperada exitosamente");
    res.status(200).json(result.rows);
  } catch (error) {
    logger.error("Error al obtener usuarios", { error });
    res.status(500).json({ msg: "Error al obtener usuarios" });
  }
}; 