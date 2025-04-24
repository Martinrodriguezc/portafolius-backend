import { Request, Response } from 'express'
import { pool } from '../../config/db'

export const getPendingEvaluations = async (req: Request, res: Response): Promise<void> => {
  const teacherId = Number(req.params.teacherId)
  try {
    const { rows } = await pool.query(
      `SELECT
         ef.id,
         s.student_id,
         CONCAT(u.first_name, ' ', u.last_name) AS student,
         s.protocol,
         (SELECT COUNT(*) FROM video_clip WHERE study_id = ef.study_id) AS videos,
         array_remove(array_agg(t.name), NULL) AS tags,
         TO_CHAR(ef.submitted_at, 'DD "de" FMMonth, YYYY') AS date
       FROM evaluation_form ef
       JOIN study s       ON ef.study_id = s.id
       JOIN users u       ON s.student_id = u.id
       LEFT JOIN clip_tag ct ON ct.clip_id = (
         SELECT vc.id
           FROM video_clip vc
          WHERE vc.study_id = s.id
          ORDER BY vc.order_index
          LIMIT 1
       )
       LEFT JOIN tag t    ON t.id = ct.tag_id
       WHERE ef.teacher_id = $1
         AND ef.score IS NULL
       GROUP BY
         ef.id,
         s.student_id,
         u.first_name,
         u.last_name,
         s.protocol,
         ef.submitted_at
       ORDER BY ef.submitted_at DESC`,
      [teacherId]
    )
    res.json({ pending: rows })
  } catch (error) {
    console.error('Error fetching pending evaluations:', error)
    res.status(500).json({ msg: 'Error fetching pending evaluations' })
  }
}

export const getCompletedEvaluations = async (req: Request, res: Response): Promise<void> => {
  const teacherId = Number(req.params.teacherId)
  try {
    const { rows } = await pool.query(
      `SELECT
         ef.id,
         s.student_id,
         CONCAT(u.first_name, ' ', u.last_name) AS student,
         s.protocol,
         (SELECT COUNT(*) FROM video_clip WHERE study_id = ef.study_id) AS videos,
         array_remove(array_agg(t.name), NULL) AS tags,
         ef.score,
         TO_CHAR(ef.submitted_at, 'DD "de" FMMonth, YYYY') AS date
       FROM evaluation_form ef
       JOIN study s       ON ef.study_id = s.id
       JOIN users u       ON s.student_id = u.id
       LEFT JOIN clip_tag ct ON ct.clip_id = (
         SELECT vc.id
           FROM video_clip vc
          WHERE vc.study_id = s.id
          ORDER BY vc.order_index
          LIMIT 1
       )
       LEFT JOIN tag t    ON t.id = ct.tag_id
       WHERE ef.teacher_id = $1
         AND ef.score IS NOT NULL
       GROUP BY
         ef.id,
         s.student_id,
         u.first_name,
         u.last_name,
         s.protocol,
         ef.score,
         ef.submitted_at
       ORDER BY ef.submitted_at DESC`,
      [teacherId]
    )
    res.json({ completed: rows })
  } catch (error) {
    console.error('Error fetching completed evaluations:', error)
    res.status(500).json({ msg: 'Error fetching completed evaluations' })
  }
}