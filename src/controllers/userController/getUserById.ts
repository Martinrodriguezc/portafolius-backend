import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query<{
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      role: string;
      created_at: string;
      last_activity: string | null;
    }>(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        to_char(u.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')       AS created_at,
        to_char(MAX(s.created_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_activity
      FROM Users u
      LEFT JOIN study s
        ON s.student_id = u.id
      WHERE u.id = $1
      GROUP BY
        u.id, u.first_name, u.last_name, u.email, u.role, u.created_at
      `,
      [id]
    );

    if (result.rows.length === 0) {
      logger.warn(`Usuario no encontrado con ID: ${id}`);
      res.status(404).json({ msg: "Usuario no encontrado" });
      return;
    }

    const user = result.rows[0];
    logger.info(`Usuario recuperado exitosamente: ${id}`);
    res.status(200).json(user);
  } catch (error) {
    logger.error(`Error al obtener usuario con ID: ${id}`, { error });
    res.status(500).json({ msg: "Error al obtener usuario" });
  }
};