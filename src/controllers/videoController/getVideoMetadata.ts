import { Request, Response } from "express";
import { pool } from "../../config/db";

export const getVideoMetadata = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT vc.id,
              vc.study_id,
              vc.object_key,
              vc.original_filename,
              vc.mime_type,
              vc.size_bytes,
              vc.duration_seconds,
              vc.upload_date,
              vc.order_index,
              s.title,
              s.protocol,
              u.first_name,
              u.last_name
         FROM video_clip vc
         JOIN study s ON vc.study_id = s.id
         JOIN users u ON s.student_id = u.id
        WHERE vc.id = $1
        ORDER BY vc.order_index`,
      [id]
    );

    res.json({ video: result.rows[0] });
  } catch (error) {
    console.error("Error al obtener clips del estudio:", error);
    res.status(500).json({ msg: "Error al obtener los clips del estudio" });
  }
};
