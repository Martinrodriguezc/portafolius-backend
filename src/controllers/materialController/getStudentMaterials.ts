// src/controllers/materialController/getStudentMaterials.ts
import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export async function getStudentMaterials(
  req: Request, res: Response, next: NextFunction
) {
  try {
    const studentId = Number(req.params.id);
    if (Number.isNaN(studentId)) {
      return res.status(400).json({ msg: "ID de estudiante inválido" });
    }
    const { rows } = await pool.query(
      `SELECT *
         FROM material
        WHERE student_id = $1
           OR student_id IS NULL
        ORDER BY upload_date DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    logger.error("Error fetching student materials:", err);
    next(err);
  }
}