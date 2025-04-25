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

    console.log("[createEvaluation] Evaluación insertada:", result.rows[0]);

    logger.info(`Nueva evaluación creada: ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error("Error al crear evaluación", { error });

    console.error("[createEvaluation] Error al insertar:", error);

    res.status(500).json({ msg: "Error al crear evaluación" });
  }
};

export const saveDiagnosis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { diagnosis } = req.body;
    const videoId = req.params.videoId;
    const studentId: number = (req as any).user.id;

    await pool.query(
      `INSERT INTO video_diagnosis (video_id, student_id, diagnosis)
       VALUES ($1, $2, $3)`,
      [videoId, studentId, diagnosis]
    );

    logger.info(`Diagnóstico guardado para video ${videoId} por estudiante ${studentId}`);
    res.status(200).json({ message: "Diagnóstico guardado exitosamente" });
  } catch (error) {
    logger.error("Error al guardar diagnóstico", { error });
    res.status(500).json({ error: "Error interno al guardar diagnóstico" });
  }
};

export const getDiagnosedVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId: number = (req as any).user.id;

    const result = await pool.query(
      `SELECT video_id FROM video_diagnosis WHERE student_id = $1`,
      [studentId]
    );

    const diagnosedVideoIds = result.rows.map((row) => row.video_id);

    res.status(200).json({ diagnosedVideoIds });
  } catch (error) {
    logger.error("Error al obtener diagnósticos", { error });
    res.status(500).json({ error: "Error interno al obtener diagnósticos" });
  }
};
