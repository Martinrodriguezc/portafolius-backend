import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const autorizarProfesor = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "UPDATE users SET autorizado = TRUE WHERE id = $1 AND role = 'profesor' RETURNING id, email, role, autorizado",
      [id]
    );

    if (result.rows.length === 0) {
      logger.warn(`No se encontró profesor con id: ${id}`);
      res.status(404).json({ msg: "Profesor no encontrado" });
      return;
    }

    logger.info(`Profesor con id ${id} autorizado correctamente`);
    res.status(200).json({ 
      msg: "Profesor autorizado correctamente", 
      usuario: result.rows[0] 
    });
  } catch (error) {
    logger.error("Error al autorizar profesor", { error });
    res.status(500).json({ msg: "Error al autorizar profesor" });
  }
}; 