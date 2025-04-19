import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { firstName, lastName, role } = req.body;

  try {
    const userExistsResult = await pool.query("SELECT * FROM Users WHERE id = $1", [id]);

    if (userExistsResult.rowCount === 0) {
      logger.warn(`Usuario no encontrado para actualizar, ID: ${id}`);
      res.status(404).json({ msg: "Usuario no encontrado" });
      return;
    }

    const updateResult = await pool.query(
      "UPDATE Users SET first_name = $1, last_name = $2, role = $3 WHERE id = $4 RETURNING id, first_name, last_name, email, role",
      [firstName, lastName, role.toLowerCase(), id]
    );

    logger.info(`Usuario actualizado exitosamente: ${id}`);
    res.status(200).json({
      msg: "Usuario actualizado correctamente",
      user: updateResult.rows[0]
    });
  } catch (error) {
    logger.error(`Error al actualizar usuario con ID: ${id}`, { error });
    res.status(500).json({ msg: "Error al actualizar usuario" });
  }
}; 