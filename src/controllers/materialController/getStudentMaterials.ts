import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";

export async function getStudentMaterials(
  req: Request, res: Response, next: NextFunction
) {
  try {
    const studentId = Number(req.params.id);
    const { rows } = await pool.query(
      `SELECT *
         FROM material
        WHERE student_id = $1
           OR student_id IS NULL
        ORDER BY uploaded_at DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}