import { RequestHandler } from "express";
import { pool } from "../../config/db";

export const saveClipSelection: RequestHandler = async (req, res, next) => {
  try {
    const clipId = Number(req.params.clipId);
    const userId = (req.user as { id: number }).id;
    const {
      protocolId,
      windowId,
      findingId,
      possibleDiagnosisId,
      subdiagnosisId,
      subSubdiagnosisId,
      thirdOrderId,
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO clip_protocol_selection
         (clip_id, user_id, protocol_id, window_id,
          finding_id, possible_diagnosis_id, subdiagnosis_id,
          sub_subdiagnosis_id, third_order_diagnosis_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (clip_id, user_id)
       DO UPDATE SET
         protocol_id               = EXCLUDED.protocol_id,
         window_id                 = EXCLUDED.window_id,
         finding_id                = EXCLUDED.finding_id,
         possible_diagnosis_id     = EXCLUDED.possible_diagnosis_id,
         subdiagnosis_id           = EXCLUDED.subdiagnosis_id,
         sub_subdiagnosis_id       = EXCLUDED.sub_subdiagnosis_id,
         third_order_diagnosis_id  = EXCLUDED.third_order_diagnosis_id
       RETURNING *;`,
      [
        clipId,
        userId,
        protocolId,
        windowId,
        findingId,
        possibleDiagnosisId,
        subdiagnosisId || null,
        subSubdiagnosisId || null,
        thirdOrderId || null,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const getClipSelection: RequestHandler = async (req, res, next) => {
  try {
    const clipId = Number(req.params.clipId);
    const userId = (req.user as { id: number }).id;
    const { rows } = await pool.query(
      `SELECT * FROM clip_protocol_selection
         WHERE clip_id = $1 AND user_id = $2`,
      [clipId, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ msg: "No hay selección" });
      return;
    }
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};