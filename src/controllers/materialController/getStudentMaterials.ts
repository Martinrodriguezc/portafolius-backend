import { RequestHandler } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const getStudentMaterials: RequestHandler<{ id: string }> = async (req, res, next) => {
  const studentId = parseInt(req.params.id, 10);
  if (Number.isNaN(studentId)) {
    res.status(400).json({ msg: "ID de estudiante inválido" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        student_id,
        type,
        title,
        description,
        url,
        size_bytes,
        mime_type,
        uploaded_at    AS upload_date,
        created_by
      FROM material
      WHERE student_id = $1
         OR student_id IS NULL
      ORDER BY uploaded_at DESC
      `,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    logger.error("Error fetching student materials:", err);
    next(err);
  }
};