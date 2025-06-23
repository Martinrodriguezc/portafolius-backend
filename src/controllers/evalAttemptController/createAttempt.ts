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
    return;
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

    // 3) recalcular promedio por estudio y volcarlo en evaluation_form
    // 3.1) obtener study_id
    const clipRow = await pool.query<{ study_id: number }>(
      `SELECT study_id FROM video_clip WHERE id = $1`,
      [clipId]
    );
    const studyId = clipRow.rows[0].study_id;

    // 3.2) calcular promedio de totales de todos los attempts de ese estudio
    const avgRes = await pool.query<{ avg_score: number }>(`
      SELECT AVG(sub.total) AS avg_score
        FROM (
          SELECT SUM(er.score) AS total
            FROM evaluation_attempt ea
            JOIN evaluation_response er ON er.attempt_id = ea.id
            JOIN video_clip vc ON vc.id = ea.clip_id
           WHERE vc.study_id = $1
           GROUP BY ea.id
        ) AS sub;
    `, [studyId]);
    const avgScore = avgRes.rows[0]?.avg_score ?? 0;

    // 3.3) upsert en evaluation_form
    await pool.query(
      `INSERT INTO evaluation_form (study_id, teacher_id, score)
       VALUES ($1, $2, $3)
       ON CONFLICT (study_id) DO UPDATE
         SET score = EXCLUDED.score`,
      [studyId, teacherId, avgScore]
    );

    // 4) responder al cliente
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

