import { Request, Response } from "express";
import { pool } from "../../config/db";

export const listResponses = async (req: Request, res: Response) => {
  const attemptId = Number(req.params.attemptId);

  try {
    const { rows } = await pool.query(
      `
      SELECT protocol_item_id, score
        FROM evaluation_response
       WHERE attempt_id = $1
      `,
      [attemptId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error al listar responses:", err);
    res.status(500).json({ msg: "Error al listar respuestas" });
  }
};
