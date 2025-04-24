import { Request, Response } from "express";
import { pool } from "../../config/db";

export const getEvaluationByStudy = async (req: Request, res: Response): Promise<void> => {
  const { studyId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        ef.id,
        ef.study_id,
        ef.score,
        ef.feedback_summary,
        ef.submitted_at
      FROM evaluation_form ef
      WHERE ef.study_id = $1
      ORDER BY ef.submitted_at DESC
      LIMIT 1
      `,
      [studyId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ msg: "No se encontró evaluación para este estudio" });
      return;
    }

    res.json({ evaluation: result.rows[0] });
  } catch (error) {
    console.error("Error al obtener evaluación por studyId:", error);
    res.status(500).json({ msg: "Error al obtener evaluación" });
  }
};
