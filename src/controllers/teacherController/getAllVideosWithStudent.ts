// src/controllers/videoController.ts
import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const getAllVideosWithStudent = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { rows } = await pool.query<{
      id: number;
      study_id: number;
      object_key: string;
      original_filename: string;
      mime_type: string;
      size_bytes: number;
      duration_seconds: number | null;
      upload_date: string;
      order_index: number;
      deleted_by_teacher: boolean;
      status: string;
      first_name: string;
      last_name: string;
      student_name?: string;
    }>(`
      SELECT
        (u.first_name || ' ' || u.last_name) AS student_name,
        row_to_json(s) AS study
      FROM study AS s
      JOIN users AS u
        ON u.id = s.student_id
      ORDER BY s.created_at DESC
    `);

    res.json({ studies: rows });
  } catch (error) {
    logger.error("Error al obtener videos con alumno:", error);
    res.status(500).json({ msg: "Error al obtener los videos" });
  }
};
