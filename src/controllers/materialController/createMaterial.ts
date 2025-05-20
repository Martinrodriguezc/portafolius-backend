import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";
import { AuthenticatedRequest } from "../../middleware/authenticateToken";

export async function createMaterial(
  req: AuthenticatedRequest,      
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const teacherId = req.user!.id;

    const {
      type,
      title,
      description,
      url,
      size_bytes,
      mime_type,
      studentIds = [],
    } = req.body;

    const insertRes = await pool.query(
      `
      INSERT INTO material
        (student_id, type, title, description, url, size_bytes, mime_type, created_by)
      VALUES
        (NULL, $1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [type, title, description, url, size_bytes, mime_type, teacherId]
    );
    const material = insertRes.rows[0];

    for (const studentId of studentIds) {
      await pool.query(
        `
        INSERT INTO material_assignment
          (material_id, student_id, assigned_by)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        `,
        [material.id, studentId, teacherId]
      );
    }

    res.status(201).json({ material });
  } catch (err) {
    logger.error("Error creating material:", err);
    next(err);
  }
}