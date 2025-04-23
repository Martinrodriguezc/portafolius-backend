import { Request, Response } from 'express';
import { pool } from '../../config/db';

export const getVideosByStudyId = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { studyId } = req.params;

  try {
    const result = await pool.query(
      `SELECT id,
              study_id,
              object_key,
              original_filename,
              mime_type,
              size_bytes,
              duration_seconds,
              upload_date,
              order_index
         FROM video_clip
        WHERE study_id = $1
        ORDER BY order_index`,
      [studyId]
    );

    res.json({ clips: result.rows });
  } catch (error) {
    console.error('Error al obtener clips del estudio:', error);
    res.status(500).json({ msg: 'Error al obtener los clips del estudio' });
  }
};
