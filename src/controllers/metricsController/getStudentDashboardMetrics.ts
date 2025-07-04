import { RequestHandler } from 'express'
import { pool } from '../../config/db'

export interface StudentDashboardMetrics {
  monthlyScores:      { mes: string; average_score: number }[]
  monthlyStudies:     { mes: string; studies_count: number }[]
  monthlyVideos:      { mes: string; videos_count: number }[]
  monthlyComments:    { mes: string; comments_count: number }[]
  topStudies:         { study_id: number; title: string; score: number }[]
  bottomStudies:      { study_id: number; title: string; score: number }[]
  evaluations:        { submitted_at: string; score: number }[]
  tagScores:          { tag: string; average_score: number }[]
  protocolCounts:     { protocol: string; count: number }[] 
}

export const getStudentDashboardMetrics: RequestHandler<{ id: string }> = async (req, res, next) => {
  const studentId = Number(req.params.id)
  try {
    const scoresR = await pool.query<{ mes: string; average_score: number }>(`
      SELECT to_char(e.submitted_at,'YYYY-MM') AS mes,
             ROUND(avg(e.score)::numeric,2) AS average_score
      FROM evaluation_form e
      JOIN study s ON e.study_id = s.id
      WHERE s.student_id = $1
      GROUP BY 1
      ORDER BY 1
    `, [studentId])

    const studiesR = await pool.query<{ mes: string; studies_count: number }>(`
      SELECT to_char(s.created_at,'YYYY-MM') AS mes,
             count(*) AS studies_count
      FROM study s
      WHERE s.student_id = $1
      GROUP BY 1
      ORDER BY 1
    `, [studentId])

    const videosR = await pool.query<{ mes: string; videos_count: number }>(`
      SELECT to_char(vc.upload_date,'YYYY-MM') AS mes,
             count(*) AS videos_count
      FROM video_clip vc
      JOIN study s ON vc.study_id = s.id
      WHERE s.student_id = $1
      GROUP BY 1
      ORDER BY 1
    `, [studentId])

    const commentsR = await pool.query<{ mes: string; comments_count: number }>(`
      SELECT to_char(cc.timestamp,'YYYY-MM') AS mes,
             count(*) AS comments_count
      FROM clip_comment cc
      JOIN video_clip vc ON cc.clip_id = vc.id
      JOIN study s ON vc.study_id = s.id
      WHERE s.student_id = $1
        AND cc.user_id IN (SELECT id FROM users WHERE role IN ('profesor', 'admin'))
      GROUP BY 1
      ORDER BY 1
    `, [studentId])

    const topR = await pool.query<{ study_id: number; title: string; score: number }>(`
      SELECT s.id AS study_id, s.title, e.score
      FROM evaluation_form e
      JOIN study s ON e.study_id = s.id
      WHERE s.student_id = $1
      ORDER BY e.score DESC
      LIMIT 5
    `, [studentId])

    const bottomR = await pool.query<{ study_id: number; title: string; score: number }>(`
      SELECT s.id AS study_id, s.title, e.score
      FROM evaluation_form e
      JOIN study s ON e.study_id = s.id
      WHERE s.student_id = $1
      ORDER BY e.score ASC
      LIMIT 5
    `, [studentId])

    const evalsR = await pool.query<{ submitted_at: string; score: number }>(`
      SELECT e.submitted_at, e.score
      FROM evaluation_form e
      JOIN study s ON e.study_id = s.id
      WHERE s.student_id = $1
      ORDER BY e.submitted_at
    `, [studentId])

    const tagR = await pool.query<{ tag: string; average_score: number }>(`
      SELECT tg.name   AS tag,
             ROUND(AVG(e.score)::numeric,2) AS average_score
      FROM evaluation_form e
      JOIN study s       ON e.study_id = s.id
      JOIN video_clip vc ON vc.study_id = s.id
      JOIN clip_tag ct   ON ct.clip_id = vc.id
      JOIN tag tg        ON tg.id        = ct.tag_id
      WHERE s.student_id = $1
      GROUP BY tg.name
      ORDER BY tg.name
    `, [studentId])

    const protoR = await pool.query<{ protocol: string; count: number }>(`
      SELECT p.name   AS protocol,
             COUNT(*)  AS count
      FROM video_clip vc
      JOIN study s      ON vc.study_id    = s.id
      LEFT JOIN protocol p 
        ON p.key = vc.protocol
      WHERE s.student_id = $1
      GROUP BY p.name
      ORDER BY p.name
    `, [studentId])

    res.json({
      monthlyScores:   scoresR.rows,
      monthlyStudies:  studiesR.rows,
      monthlyVideos:   videosR.rows,
      monthlyComments: commentsR.rows,
      topStudies:      topR.rows,
      bottomStudies:   bottomR.rows,
      evaluations:     evalsR.rows,
      tagScores:       tagR.rows,
      protocolCounts:  protoR.rows         
    } as StudentDashboardMetrics)
  } catch (err) {
    next(err)
  }
}