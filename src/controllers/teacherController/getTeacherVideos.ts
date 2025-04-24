import { Request, Response } from "express";
import { pool } from "../../config/db";

export const getTeacherVideos = async (
  req: Request,
  res: Response
): Promise<void> => {
  const teacherId = Number(req.params.teacherId);

  try {
    const { rows: pending } = await pool.query(
      `SELECT
         vc.id,
         vc.study_id,
         vc.file_path AS original_filename,
         vc.upload_date,
         vc.duration_seconds
       FROM video_clip vc
       WHERE NOT EXISTS (
         SELECT 1
           FROM evaluation_form ef
          WHERE ef.study_id = vc.study_id
            AND ef.teacher_id = $1
       )
       ORDER BY vc.upload_date DESC`,
      [teacherId]
    );

    const { rows: evaluated } = await pool.query(
      `SELECT
         vc.id,
         vc.study_id,
         vc.file_path AS original_filename,
         ef.submitted_at   AS evaluated_at,
         ef.score,
         vc.duration_seconds
       FROM video_clip vc
       JOIN evaluation_form ef
         ON ef.study_id = vc.study_id
        AND ef.teacher_id = $1
       WHERE ef.score IS NOT NULL
       ORDER BY ef.submitted_at DESC`,
      [teacherId]
    );

    res.json({ pending, evaluated });
  } catch (error) {
    console.error("Error fetching teacher videos:", error);
    res.status(500).json({ msg: "Error fetching teacher videos" });
  }
};