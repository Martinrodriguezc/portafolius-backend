import { RequestHandler } from "express";
import { pool } from "../../config/db";

export const getPossibleDiagnosesByFinding: RequestHandler = async (req, res, next) => {
  try {
    const { findingId } = req.params;
    const { rows } = await pool.query<{ id: number; key: string; name: string }>(
      `SELECT DISTINCT id, key, name
         FROM possible_diagnosis
        WHERE finding_id = $1
        ORDER BY key`,
      [findingId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};