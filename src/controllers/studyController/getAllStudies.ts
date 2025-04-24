import { Request, Response } from "express";
import { pool } from "../../config/db";

export const getAllStudiesWithEvaluationStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id AS study_id,
        s.title,
        s.protocol,
        s.status,
        s.created_at,
        u.first_name,
        u.last_name,
        u.email,
        EXISTS (
          SELECT 1 FROM evaluation_form ef WHERE ef.study_id = s.id
        ) AS has_evaluation,
        (
          SELECT ef.score 
          FROM evaluation_form ef 
          WHERE ef.study_id = s.id 
          ORDER BY ef.submitted_at DESC 
          LIMIT 1
        ) AS score
      FROM study s
      JOIN users u ON u.id = s.student_id
      ORDER BY s.created_at DESC;
    `);

    res.json({ studies: result.rows });
  } catch (error) {
    console.error("Error al obtener todos los estudios:", error);
    res.status(500).json({ msg: "Error al obtener estudios" });
  }
};
