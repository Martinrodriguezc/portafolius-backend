import { RequestHandler } from "express";
import { pool } from "../../config/db";

export const getSubdiagnosesByDiagnosis: RequestHandler = async (req, res, next) => {
  try {
    const { diagnosisId } = req.params;
    const { rows } = await pool.query<{ id: number; key: string; name: string }>(
      `SELECT id, key, name
         FROM subdiagnosis
        WHERE possible_diagnosis_id = $1
        ORDER BY key`,
      [diagnosisId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};