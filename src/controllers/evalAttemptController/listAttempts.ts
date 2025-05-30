import { Request, Response } from "express";
import { pool } from "../../config/db";

export const listAttempts = async (req: Request, res: Response) => {
  const clipId = Number(req.params.clipId);
  try {
    const attemptsR = await pool.query(
      `SELECT ea.id,
          ea.submitted_at,
          COALESCE(SUM(er.score), 0) AS total_score,
          CONCAT(u.first_name, ' ', u.last_name) AS teacher_name,
          ea.comment
        FROM evaluation_attempt ea
    LEFT JOIN evaluation_response er ON er.attempt_id = ea.id
    JOIN "users" u ON u.id = ea.teacher_id
    WHERE ea.clip_id = $1
    GROUP BY ea.id, teacher_name, ea.comment
    ORDER BY ea.submitted_at DESC`,
      [clipId]
    );
    res.json({ attempts: attemptsR.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al listar intentos" });
  }
};
