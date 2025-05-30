import { Request, Response } from "express";
import { pool } from "../../config/db";

export const createResponse = async (req: Request, res: Response) => {
  const attemptId = Number(req.params.attemptId);
  const { protocol_item_id, score } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO evaluation_response (attempt_id, protocol_item_id, score)
      VALUES ($1, $2, $3)
      ON CONFLICT (attempt_id, protocol_item_id) DO UPDATE
        SET score = EXCLUDED.score
      `,
      [attemptId, protocol_item_id, score]
    );
    res.status(201).json({ msg: "Respuesta guardada" });
  } catch (err) {
    console.error("Error al crear response:", err);
    res.status(500).json({ msg: "Error al guardar respuesta" });
  }
};
