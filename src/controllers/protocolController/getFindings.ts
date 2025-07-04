import { RequestHandler } from "express";
import { pool } from "../../config/db";

export const getFindingsByWindow: RequestHandler = async (req, res, next) => {
  try {
    const { windowId } = req.params;
    const { rows } = await pool.query<{ id: number; key: string; name: string }>(
      `SELECT id, key, name
         FROM finding
        WHERE window_id = $1
        ORDER BY key`,
      [windowId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};