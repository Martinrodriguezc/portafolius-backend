import { Request, Response } from "express";
import { pool } from "../../config/db";

export const listAttempts = async (req: Request, res: Response) => {
  const clipId = Number(req.params.clipId);
  try {
    const attemptsR = await pool.query(
      `SELECT ea.id,
              ea.submitted_at,
              SUM(er.score) AS total_score
         FROM evaluation_attempt ea
         JOIN evaluation_response er
           ON er.attempt_id = ea.id
        WHERE ea.clip_id = $1
        GROUP BY ea.id
        ORDER BY ea.submitted_at`,
      [clipId]
    );
    res.json({ attempts: attemptsR.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al listar intentos" });
  }
};
