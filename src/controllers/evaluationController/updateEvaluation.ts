import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const updateEvaluation = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { score, feedback_summary } = req.body;
  const teacherId = (req as any).user.id;

  if (typeof score !== "number" || score < 1 || score > 10) {
    res.status(400).json({ msg: "Score debe ser un número entre 1 y 10" });
    return;
  }

  try {
    const existing = await pool.query(
      `SELECT * FROM evaluation_form WHERE id = $1 AND teacher_id = $2`,
      [id, teacherId]
    );

    if (existing.rows.length === 0) {
      res.status(403).json({ msg: "No tienes permiso para editar esta evaluación" });
      return;
    }

    const updated = await pool.query(
      `UPDATE evaluation_form
       SET score = $1, feedback_summary = $2
       WHERE id = $3
       RETURNING id, study_id, teacher_id, submitted_at, score, feedback_summary`,
      [score, feedback_summary, id]
    );

    logger.info(`Evaluación actualizada: ${id}`);
    res.status(200).json(updated.rows[0]);
  } catch (error) {
    logger.error("Error al actualizar evaluación", { error });
    res.status(500).json({ msg: "Error al actualizar evaluación" });
  }
};
