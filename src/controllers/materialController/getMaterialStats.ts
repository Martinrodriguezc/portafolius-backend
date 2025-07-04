import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export async function getMaterialStats(
  _req: Request, res: Response, next: NextFunction
) {
  try {
    const totalMatR = await pool.query(`SELECT COUNT(*) FROM material`);
    const totalMaterials = Number(totalMatR.rows[0].count);

    const withR = await pool.query(`
      SELECT COUNT(DISTINCT student_id)
      FROM material_assignment
    `);
    const studentsWith = Number(withR.rows[0].count);

    const totalStuR = await pool.query(`
      SELECT COUNT(*) FROM users WHERE role = 'estudiante'
    `);
    const totalStudents = Number(totalStuR.rows[0].count);

    const studentsWithout = totalStudents - studentsWith;

    res.json({ totalMaterials, studentsWith, studentsWithout });
  } catch (err) {
    logger.error("Error fetching material stats:", err);
    next(err);
  }
}