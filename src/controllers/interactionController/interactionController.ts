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
  try {
    const { clipId } = req.params;
    const { userId, imageQualityId, finalDiagnosisId, professorComment } = req.body;

    await pool.query(
      `INSERT INTO clip_interaction (
        clip_id, user_id, role,
        image_quality_id, final_diagnosis_id, professor_comment
      ) VALUES ($1,$2,'profesor',$3,$4,$5)`,
      [clipId, userId, imageQualityId, finalDiagnosisId, professorComment]
    );

    res.status(201).json({ message: 'Revisión de profesor registrada.' });
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