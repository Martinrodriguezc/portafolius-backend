import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const createEvaluation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { studyId } = req.params;
  const { score, feedback_summary } = req.body;

  // Extrae el ID del profesor desde el token (inyectado por authenticateToken)
  const teacherId: number = (req as any).user.id;

  if (typeof score !== "number" || score < 1 || score > 10) {
    res.status(400).json({ msg: "Score debe ser número entre 1 y 10" });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO evaluation_form (study_id, teacher_id, score, feedback_summary)
       VALUES ($1, $2, $3, $4)
       RETURNING id, study_id, teacher_id, submitted_at, score, feedback_summary`,
      [studyId, teacherId, score, feedback_summary]
    );
    logger.info(`Nueva evaluación creada: ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error("Error al crear evaluación", { error });
    res.status(500).json({ msg: "Error al crear evaluación" });
  }
};

