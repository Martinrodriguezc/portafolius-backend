import { RequestHandler } from 'express'
import { pool } from '../../config/db'

export const getInteractionMetrics: RequestHandler = async (req, res, next) => {
  const studentId = Number(req.params.studentId)

  try {
    const { rows } = await pool.query(
      `
      SELECT
        student.protocol_key                              AS protocol,
        COUNT(*)                                         AS count,

        -- Final diagnosis breakdown
        SUM(CASE WHEN fd.name = 'Verdadero(+)' THEN 1 ELSE 0 END)::INT AS tp,
        SUM(CASE WHEN fd.name = 'Verdadero(–)' THEN 1 ELSE 0 END)::INT AS tn,
        SUM(CASE WHEN fd.name = 'Falso(+)'     THEN 1 ELSE 0 END)::INT AS fp,
        SUM(CASE WHEN fd.name = 'Falso(–)'     THEN 1 ELSE 0 END)::INT AS fn,

        -- Image quality breakdown
        SUM(CASE WHEN iq.name = 'Buena' THEN 1 ELSE 0 END)::INT AS "iqGood",
        SUM(CASE WHEN iq.name = 'Mala'  THEN 1 ELSE 0 END)::INT AS "iqPoor",

        -- Positive / negative totals (final diagnosis true vs false)
        SUM(CASE WHEN fd.name IN ('Verdadero(+)','Verdadero(–)') THEN 1 ELSE 0 END)::INT AS positive,
        SUM(CASE WHEN fd.name IN ('Falso(+)','Falso(–)')     THEN 1 ELSE 0 END)::INT AS negative

      FROM clip_interaction student

      -- unión para traer la respuesta del profe sobre esa misma entrega
      LEFT JOIN clip_interaction prof
        ON prof.clip_id = student.clip_id
       AND prof.role    = 'profesor'

      LEFT JOIN image_quality    iq ON iq.id = prof.image_quality_id
      LEFT JOIN final_diagnosis  fd ON fd.id = prof.final_diagnosis_id

      WHERE student.role   = 'estudiante'
        AND student.user_id = $1

      GROUP BY student.protocol_key
      ORDER BY student.protocol_key;
      `,
      [studentId]
    )

    res.json(rows)
  } catch (err) {
    next(err)
  }
}