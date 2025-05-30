import { RequestHandler } from 'express'
import { pool } from '../../config/db'

export interface TeacherStudentStats {
  protocolCounts: { protocol: string; count: number }[]
}

export const getStudentStats: RequestHandler<{ id: string }> = async (req, res, next) => {
  const studentId = Number(req.params.id)
  try {
    const result = await pool.query<{ protocol: string; count: number }>(`
      SELECT
        vc.protocol   AS protocol,
        COUNT(*)      AS count
      FROM video_clip vc
      JOIN study s ON vc.study_id = s.id
      WHERE s.student_id = $1
      GROUP BY vc.protocol
      ORDER BY vc.protocol
    `, [studentId])

    res.json({ protocolCounts: result.rows } as TeacherStudentStats)
  } catch (err) {
    next(err)
  }
}