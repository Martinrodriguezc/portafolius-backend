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
        id,
        study_id,
        teacher_id,
        submitted_at,
        score,
        feedback_summary
      FROM evaluation_form
      WHERE teacher_id = $1
      ORDER BY submitted_at DESC
      `,
      [teacherId]
    );

    res.json({ evaluations: result.rows });
  } catch (error) {
    logger.error("Error al obtener evaluaciones", { error });
    res.status(500).json({ msg: "Error al obtener evaluaciones" });
  }
};
