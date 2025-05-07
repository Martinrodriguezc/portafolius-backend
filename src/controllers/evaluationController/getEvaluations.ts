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
        s.created_at,
        stu.first_name AS student_first_name,
        stu.last_name AS student_last_name,
        tea.first_name || ' ' || tea.last_name AS teacher_name
      FROM evaluation_form ef
      JOIN study s ON ef.study_id = s.id
      JOIN users stu ON s.student_id = stu.id
      JOIN users tea ON ef.teacher_id = tea.id
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
