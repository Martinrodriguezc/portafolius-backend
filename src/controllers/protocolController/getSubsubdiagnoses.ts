import { RequestHandler } from "express";
import { pool } from "../../config/db";

export const getSubSubdiagnosesBySubdiagnosis: RequestHandler = async (req, res, next) => {
  try {
    const { subId } = req.params;
    const { rows } = await pool.query<{ id: number; key: string; name: string }>(
      `SELECT id, key, name
         FROM sub_subdiagnosis
        WHERE subdiagnosis_id = $1
        ORDER BY key`,
      [subId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};