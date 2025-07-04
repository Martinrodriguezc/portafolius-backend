import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const rechazarProfesor = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Primero verificamos que el usuario existe y es un profesor no autorizado
    const userCheck = await pool.query(
      "SELECT id, email, role, autorizado FROM users WHERE id = $1 AND role = 'profesor'",
      [id]
    );

    if (userCheck.rows.length === 0) {
      logger.warn(`No se encontró profesor con id: ${id}`);
      res.status(404).json({ msg: "Profesor no encontrado" });
      return;
    }

    const user = userCheck.rows[0];

    if (user.autorizado) {
      logger.warn(`Intento de rechazar profesor ya autorizado con id: ${id}`);
      res.status(400).json({ msg: "No se puede rechazar un profesor que ya está autorizado" });
      return;
    }

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 AND role = 'profesor' AND autorizado = FALSE RETURNING id, email",
      [id]
    );

    if (result.rows.length === 0) {
      logger.warn(`No se pudo eliminar el profesor con id: ${id}`);
      res.status(500).json({ msg: "Error al rechazar profesor" });
      return;
    }

    logger.info(`Profesor con id ${id} y email ${result.rows[0].email} rechazado y eliminado correctamente`);
    res.status(200).json({ 
      msg: "Profesor rechazado y eliminado correctamente", 
      usuario_eliminado: result.rows[0] 
    });
  } catch (error) {
    logger.error("Error al rechazar profesor", { error });
    res.status(500).json({ msg: "Error al rechazar profesor" });
  }
}; 