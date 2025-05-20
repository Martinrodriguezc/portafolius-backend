import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

/**
 * GET /materials/:id/assignments
 * Devuelve la lista de estudiantes a los que fue asignado un material
 */
export async function getMaterialAssignments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const materialId = Number(req.params.id);
    const { rows } = await pool.query(
      `
      SELECT student_id, assigned_by, assigned_at
      FROM material_assignment
      WHERE material_id = $1
      `,
      [materialId]
    );
    res.json(rows);
  } catch (err) {
    logger.error("Error fetching material assignments:", err);
    next(err);
  }
}