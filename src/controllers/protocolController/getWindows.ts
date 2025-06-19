import { RequestHandler } from "express";
import { pool } from "../../config/db";

export const getWindowsByProtocol: RequestHandler = async (req, res, next) => {
  try {
    const { protocolKey } = req.params;
    const proto = await pool.query<{ id: number }>(
      `SELECT id FROM protocol WHERE key = $1`,
      [protocolKey]
    );
    if (proto.rowCount === 0) {
      res.status(404).json({ msg: "Protocolo no encontrado" });
      return;
    }
    const protocolId = proto.rows[0].id;

    const { rows } = await pool.query<{ id: number; key: string; name: string }>(
      `SELECT id, key, name 
         FROM protocol_window 
        WHERE protocol_id = $1
        ORDER BY key`,
      [protocolId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};