import { RequestHandler } from "express";
import { pool } from "../../config/db";

export const getFinalDiagnoses: RequestHandler = async (_req, res, next) => {
  try {
    const { rows } = await pool.query<{ id: number; name: string }>(
      `SELECT id, name FROM final_diagnosis ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};