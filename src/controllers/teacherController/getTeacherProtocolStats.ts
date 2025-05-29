import { RequestHandler } from 'express'
import { pool } from '../../config/db'

export interface ProtocolCount {
  protocol: string
  count: number
}

export const getTeacherProtocolStats: RequestHandler<{ teacherId: string }> = async (req, res, next) => {
  const teacherId = Number(req.params.teacherId)
  try {
    const result = await pool.query<ProtocolCount>(`
      SELECT vc.protocol,
             COUNT(*) AS count
      FROM video_clip vc
      JOIN study s       ON vc.study_id = s.id
      JOIN evaluation_form e ON e.study_id = s.id
      WHERE s.teacher_id = $1
      GROUP BY vc.protocol
      ORDER BY vc.protocol
    `, [teacherId])

    res.json({ protocolCounts: result.rows })
  } catch (err) {
    next(err)
  }
}