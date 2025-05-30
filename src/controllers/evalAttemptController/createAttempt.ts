import { RequestHandler } from "express";
import { pool } from "../../config/db";

export const createAttempt: RequestHandler = async (req, res, next) => {
  const teacherId = (req as any).user.id;
  const clipId     = Number(req.params.clipId);
  const { protocolKey, responses, comment } = req.body;

  // Validación
  if (
    !Array.isArray(responses) ||
    responses.some(r => typeof r.score !== "number")
  ) {
    res.status(400).json({ msg: "Formato de respuestas inválido" });
    return; // <-- no "return res...", solo "res..." y luego "return;"
  }

  try {
    // 1) crear el attempt
    const attR = await pool.query<{ id: number; submitted_at: string }>(
        `INSERT INTO evaluation_attempt(clip_id, teacher_id, comment)
        VALUES($1, $2, $3)
        RETURNING id, submitted_at`,
        [clipId, teacherId, comment ?? null]
    );
    const attemptId = attR.rows[0].id;

    // 2) guardar cada response
    for (const { itemKey, score } of responses) {
      const itR = await pool.query<{ id: number; max_score: number }>(
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

    // 3) responder
    res.status(201).json({
      attemptId,
      submitted_at: attR.rows[0].submitted_at,
    });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al crear intento" });
  }
};
