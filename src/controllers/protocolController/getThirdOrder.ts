import { RequestHandler } from "express";
import { pool } from "../../config/db";

export const getThirdOrderBySubSub: RequestHandler = async (req, res, next) => {
  try {
    const { subSubId } = req.params;
    const { rows } = await pool.query<{ id: number; key: string; name: string }>(
      `SELECT id, key, name
         FROM third_order_diagnosis
        WHERE sub_subdiagnosis_id = $1
        ORDER BY key`,
      [subSubId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};