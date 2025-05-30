import { Request, Response } from "express";
import { pool } from "../../../config/db";

export const createProtocol = async (req: Request, res: Response): Promise<void> => {
  const { title, description, steps, createdBy } = req.body;

  if (!title || !steps || !Array.isArray(steps)) {
    res.status(400).json({ error: "Faltan campos obligatorios o el formato es incorrecto" });
    return;
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO protocol (title, description, steps, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `,
      [title, description, JSON.stringify(steps), createdBy]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear el protocolo:", error);
    res.status(500).json({ error: "Error al crear el protocolo" });
  }
};
