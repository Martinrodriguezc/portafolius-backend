import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { id }                       = req.params;
  const { firstName, lastName, email } = req.body; 

  try {
    const { rowCount } = await pool.query("SELECT 1 FROM users WHERE id = $1", [id]);
    if (!rowCount) {
      logger.warn(`Usuario no encontrado (id=${id})`);
      res.status(404).json({ msg: "Usuario no encontrado" });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE users
          SET first_name = COALESCE($1, first_name),
              last_name  = COALESCE($2, last_name),
              email      = COALESCE($3, email)
        WHERE id = $4
      RETURNING id, first_name, last_name, email, role`,
      [firstName ?? null, lastName ?? null, email ?? null, id]
    );

    logger.info(`Usuario actualizado (id=${id})`);
    res.json({ user: rows[0] });
  } catch (error) {
    logger.error(`Error al actualizar usuario (id=${id})`, { error });
    res.status(500).json({ msg: "Error al actualizar usuario" });
  }
};