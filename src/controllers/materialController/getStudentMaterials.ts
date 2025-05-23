// src/controllers/materialController/getStudentMaterials.ts
import { RequestHandler } from "express";
import { pool }          from "../../config/db";
import logger            from "../../config/logger";

export const getStudentMaterials: RequestHandler<{ id: string }> = async (
  req,
  res,
  next
): Promise<void> => {
  const studentId = parseInt(req.params.id, 10);
  if (isNaN(studentId)) {
    res.status(400).json({ msg: "ID de estudiante inválido" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        m.id,
        m.type,
        m.title,
        m.description,
        m.url,
        m.size_bytes,
        m.mime_type,
        m.uploaded_at    AS upload_date,
        m.created_by
      FROM material m
      LEFT JOIN material_assignment ma
        ON ma.material_id = m.id
      WHERE
        m.student_id = $1
        OR (m.student_id IS NULL AND ma.student_id = $1)
      ORDER BY m.uploaded_at DESC
      `,
      [studentId]
    );

    // NOTE: no `return` here, just send the JSON
    res.json(rows);
  } catch (err) {
    logger.error("Error fetching student materials:", err);
    next(err);
  }
};