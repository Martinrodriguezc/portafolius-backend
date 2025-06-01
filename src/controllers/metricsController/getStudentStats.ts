import { RequestHandler } from 'express'
import { pool } from '../../config/db'

export interface TeacherStudentStats {
  protocolCounts: { protocol: string; count: number }[]
}

export const getStudentStats: RequestHandler<{ id: string }> = async (req, res, next) => {
  const studentId = Number(req.params.id)
  try {
    const result = await pool.query<{ protocol: string; count: number }>(`
      SELECT p.name     AS protocol,
             COUNT(*)    AS count
      FROM video_clip vc
      JOIN study s ON vc.study_id = s.id
      LEFT JOIN protocol p 
        ON p.key = vc.protocol
      WHERE s.student_id = $1
      GROUP BY p.name
      ORDER BY p.name;
    `, [studentId])

    res.json({ protocolCounts: result.rows } as TeacherStudentStats)
  } catch (err) {
    next(err)
  }
}