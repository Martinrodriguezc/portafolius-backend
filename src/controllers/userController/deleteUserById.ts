import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM Users WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      logger.warn(`Usuario no encontrado para eliminar, ID: ${id}`);
      res.status(404).json({ msg: "Usuario no encontrado" });
      return;
    }

    logger.info(`Usuario eliminado exitosamente: ${id}`);
    res.status(200).json({ msg: "Usuario eliminado correctamente" });
  } catch (error) {
    logger.error(`Error al eliminar usuario con ID: ${id}`, { error });
    res.status(500).json({ msg: "Error al eliminar usuario" });
  }
}; 