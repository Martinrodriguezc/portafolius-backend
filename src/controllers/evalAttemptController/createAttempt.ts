import { Request, Response } from "express";
import { pool } from "../../config/db";

export const createAttempt = async (req: Request, res: Response) => {
  const teacherId = (req as any).user.id;
  const clipId = Number(req.params.clipId);
  const { protocolKey, responses } = req.body;

  if (
    !Array.isArray(responses) ||
    responses.some(r => typeof r.score !== "number")
  ) {
    return res.status(400).json({ msg: "Formato de respuestas inválido" });
  }

  try {
    // crear intento
    const attR = await pool.query(
      `INSERT INTO evaluation_attempt(clip_id, teacher_id)
       VALUES($1, $2)
       RETURNING id, submitted_at`,
      [clipId, teacherId]
    );
    const attemptId = attR.rows[0].id;

    // guardar respuestas
    for (const { itemKey, score } of responses) {
      const itR = await pool.query(
        `SELECT id, max_score
           FROM protocol_item
          WHERE key = $1`,
        [itemKey]
      );
      if (!itR.rows.length) continue;
      const { id: itemId, max_score } = itR.rows[0];
      const clamped = Math.max(0, Math.min(max_score, score));
      await pool.query(
        `INSERT INTO evaluation_response(attempt_id, protocol_item_id, score)
         VALUES($1, $2, $3)`,
        [attemptId, itemId, clamped]
      );
    }

    res.status(201).json({
      attemptId,
      submitted_at: attR.rows[0].submitted_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al crear intento" });
  }
};
