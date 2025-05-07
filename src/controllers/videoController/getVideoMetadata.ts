import { Request, Response } from "express";
import { pool } from "../../config/db";

export const getVideoMetadata = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clipId = Number(req.params.id);
  if (isNaN(clipId)) {
    res.status(400).json({ msg: "ID de clip inválido" });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT
         vc.id,
         vc.study_id,
         vc.object_key,
         vc.original_filename,
         vc.mime_type,
         vc.size_bytes,
         vc.duration_seconds,
         vc.upload_date,
         vc.order_index,
         vc.protocol,
         s.title         AS study_title,
         s.status        AS study_status,
         u.first_name    AS student_first_name,
         u.last_name     AS student_last_name,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'id',              t.id,
               'name',            t.name,
               'condition_id',    t.condition_id
             )
           ) FILTER (WHERE t.id IS NOT NULL),
           '[]'
         ) AS tags
       FROM video_clip vc
       JOIN study s    ON vc.study_id = s.id
       JOIN users u    ON s.student_id = u.id
       LEFT JOIN clip_tag ct ON ct.clip_id = vc.id
       LEFT JOIN tag       t ON ct.tag_id = t.id
       WHERE vc.id = $1
       GROUP BY
         vc.id,
         s.title,
         s.status,
         u.first_name,
         u.last_name
       ORDER BY vc.order_index;`,
      [clipId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ msg: "Video no encontrado" });
      return;
    }

    // Devuelve un objeto con todos los metadatos + array de tags
    res.json({ video: result.rows[0] });
  } catch (error) {
    console.error("Error al obtener metadata del video:", error);
    res.status(500).json({ msg: "Error al obtener metadata del video" });
  }
};
