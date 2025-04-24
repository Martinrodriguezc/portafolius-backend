import { Request, Response } from 'express';
import { pool } from '../../config/db';

export const getRecentComments = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT
         cc.id,
         cc.comment_text   AS text,
         CONCAT(u.first_name, ' ', u.last_name) AS author,
         TO_CHAR(cc.timestamp, 'DD "de" FMMonth, YYYY') AS date,
         vc.study_id       AS "studyId",
         cc.clip_id        AS "videoId"
       FROM clip_comment cc
       JOIN video_clip vc   ON vc.id = cc.clip_id
       JOIN study s         ON s.id = vc.study_id
       JOIN users u         ON u.id = cc.user_id
       WHERE s.student_id = $1
         AND cc.user_id   != $1
       ORDER BY cc.timestamp DESC
       LIMIT 50`,
      [userId]
    );
    res.json({ comments: result.rows });
  } catch (err) {
    console.error('Error al obtener comentarios recientes:', err);
    res.status(500).json({ msg: 'Error al obtener comentarios' });
  }
};