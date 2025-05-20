import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";


export async function getStudentMaterials(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const studentId = Number(req.params.id);
    const { rows } = await pool.query(
      `
      SELECT m.*, ma.assigned_at
      FROM material AS m
      LEFT JOIN material_assignment AS ma
        ON ma.material_id = m.id AND ma.student_id = $1
      WHERE m.student_id = $1
         OR m.student_id IS NULL
         OR ma.student_id = $1
      ORDER BY m.uploaded_at DESC
      `,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    logger.error("Error fetching student materials:", err);
    next(err);
  }
}