import { Request, Response } from "express";
import { pool } from "../../../config/db";

export const updateProtocol = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, description, steps } = req.body;

  if (!title || !steps || !Array.isArray(steps)) {
    res.status(400).json({ error: "Faltan campos obligatorios o el formato de los pasos es inválido" });
    return;
  }

  try {
    const result = await pool.query(
      `
      UPDATE protocol
      SET title = $1,
          description = $2,
          steps = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *;
      `,
      [title, description, JSON.stringify(steps), id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Protocolo no encontrado" });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar el protocolo:", error);
    res.status(500).json({ error: "Error al actualizar el protocolo" });
  }
};
