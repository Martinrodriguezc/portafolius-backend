import { RequestHandler } from 'express';
import { pool } from '../../config/db';

export const createStudentInteraction: RequestHandler = async (req, res, next) => {
  try {
    const { clipId } = req.params;
    const {
      userId,
      protocolKey,
      windowId,
      findingId,
      possibleDiagnosisId,
      subdiagnosisId,
      subSubdiagnosisId,
      thirdOrderDiagnosisId,
      studentComment,
      studentReady,
    } = req.body;

    await pool.query(
      `INSERT INTO clip_interaction (
        clip_id, user_id, role,
        protocol_key, window_id, finding_id, possible_diagnosis_id,
        subdiagnosis_id, sub_subdiagnosis_id, third_order_diagnosis_id,
        student_comment, student_ready
      ) VALUES ($1,$2,'estudiante',$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        clipId,
        userId,
        protocolKey,
        windowId,
        findingId,
        possibleDiagnosisId,
        subdiagnosisId,
        subSubdiagnosisId,
        thirdOrderDiagnosisId,
        studentComment,
        studentReady,
      ]
    );

    res.status(201).json({ message: 'Entrega de estudiante registrada.' });
  } catch (err) {
    next(err);
  }
};

export const createProfessorInteraction: RequestHandler = async (req, res, next) => {
  // 1) extraemos el teacherId inyectado por authenticateToken en req.user
  const teacherId = (req as any).user.id as number;
  const clipId = Number(req.params.clipId);

  // 2) destructuramos del body sólo lo que necesitamos
  const { imageQualityId, finalDiagnosisId, professorComment } = req.body;

  try {
    // 3) insert/update en la tabla
    const { rows } = await pool.query(
      `
      INSERT INTO clip_interaction (
        clip_id, user_id, role,
        image_quality_id, final_diagnosis_id, professor_comment, created_at
      )
      VALUES ($1, $2, 'profesor', $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (clip_id, role) DO UPDATE
        SET
          image_quality_id   = EXCLUDED.image_quality_id,
          final_diagnosis_id = EXCLUDED.final_diagnosis_id,
          professor_comment  = EXCLUDED.professor_comment,
          created_at         = CURRENT_TIMESTAMP
      RETURNING *;
      `,
      [
        clipId,
        teacherId,
        imageQualityId ?? null,
        finalDiagnosisId ?? null,
        professorComment ?? null,
      ]
    );

    // 4) devolvemos al cliente la fila creada/actualizada
    res.status(200).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const getInteractionsByClip: RequestHandler = async (req, res, next) => {
  try {
    const { clipId } = req.params;
    const { rows } = await pool.query(
      `
      SELECT
        ci.id,
        ci.clip_id                    AS "clipId",
        ci.user_id                    AS "userId",
        ci.role,
        ci.protocol_key               AS "protocolKey",

        ci.window_id                  AS "windowId",
        pw.name                       AS "windowName",

        ci.finding_id                 AS "findingId",
        f.name                        AS "findingName",

        ci.possible_diagnosis_id      AS "diagnosisId",
        pd.name                       AS "possibleDiagnosisName",

        ci.subdiagnosis_id            AS "subdiagnosisId",
        sd.name                       AS "subdiagnosisName",

        ci.sub_subdiagnosis_id        AS "subSubId",
        ssd.name                      AS "subSubName",

        ci.third_order_diagnosis_id   AS "thirdOrderId",
        tod.name                      AS "thirdOrderName",

        ci.student_comment            AS "comment",
        ci.student_ready              AS "isReady",

        ci.image_quality_id           AS "imageQualityId",
        iq.name                       AS "imageQualityName",

        ci.final_diagnosis_id         AS "finalDiagnosisId",
        fd.name                       AS "finalDiagnosisName",

        ci.professor_comment          AS "professorComment",
        ci.created_at                 AS "createdAt"
      FROM clip_interaction ci
      LEFT JOIN protocol_window pw         ON pw.id = ci.window_id
      LEFT JOIN finding f                  ON f.id  = ci.finding_id
      LEFT JOIN possible_diagnosis pd      ON pd.id = ci.possible_diagnosis_id
      LEFT JOIN subdiagnosis sd            ON sd.id = ci.subdiagnosis_id
      LEFT JOIN sub_subdiagnosis ssd       ON ssd.id = ci.sub_subdiagnosis_id
      LEFT JOIN third_order_diagnosis tod  ON tod.id = ci.third_order_diagnosis_id
      LEFT JOIN image_quality iq           ON iq.id = ci.image_quality_id
      LEFT JOIN final_diagnosis fd         ON fd.id = ci.final_diagnosis_id
      WHERE ci.clip_id = $1
      ORDER BY ci.created_at;
      `,
      [clipId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};