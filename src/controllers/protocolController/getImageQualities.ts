import { RequestHandler } from "express";
import { pool } from "../../config/db";

export const getImageQualities: RequestHandler = async (_req, res, next) => {
  try {
    const { rows } = await pool.query<{ id: number; name: string }>(
      `SELECT id, name FROM image_quality ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};