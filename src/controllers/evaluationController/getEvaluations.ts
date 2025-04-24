import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const getEvaluations = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;

    const result = await pool.query(
      `
      SELECT 
        ef.id,
        ef.study_id,
        ef.teacher_id,
        ef.submitted_at,
        ef.score,
        ef.feedback_summary,
        s.title,
        s.protocol,
        s.created_at,
        u.first_name,
        u.last_name
      FROM evaluation_form ef
      JOIN study s ON ef.study_id = s.id
      JOIN users u ON s.student_id = u.id
      WHERE ef.teacher_id = $1
      ORDER BY ef.submitted_at DESC
      `,
      [teacherId]
    );

    console.log("Evaluaciones devueltas:", result.rows);
    res.json({ evaluations: result.rows });
  } catch (error) {
    logger.error("Error al obtener evaluaciones", { error });
    res.status(500).json({ msg: "Error al obtener evaluaciones" });
  }
};
