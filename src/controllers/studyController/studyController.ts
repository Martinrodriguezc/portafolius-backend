import { Request, Response } from "express";
import { pool } from "../../config/db";

export const getStudentStudies = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        s.id,
        s.title,
        s.protocol,
        s.status,
        s.created_at,
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
      WHERE s.student_id = $1
      ORDER BY s.created_at DESC`,
      [userId]
    );

    res.json({ studies: result.rows });
  } catch (error) {
    console.error("Error al obtener estudios del usuario:", error);
    res.status(500).json({ msg: "Error al obtener estudios" });
  }
};
