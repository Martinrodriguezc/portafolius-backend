import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const listEvaluationsByStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = Number(req.query.studentId);
    if (!studentId) {
      res.status(400).json({ msg: "studentId es requerido" });
      return;
    }
    const result = await pool.query(
      `SELECT
         e.id,
         e.study_id,
         e.submitted_at,
         e.score,
         e.feedback_summary
       FROM evaluation_form e
       JOIN study s ON s.id = e.study_id
       WHERE s.student_id = $1`,
      [studentId]
    );
    res.json(result.rows);
  } catch (error) {
    logger.error("Error listando evaluaciones", { error });
    res.status(500).json({ msg: "Error listando evaluaciones" });
  }
};