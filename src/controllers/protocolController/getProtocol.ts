import { RequestHandler } from "express";
import { pool } from "../../config/db";

export const getProtocol: RequestHandler = async (req, res, next) => {
  try {
    const { key } = req.params;

    
    const protoR = await pool.query<{
      id: number;
      name: string;
      key: string;
    }>(
      `SELECT id, name, key
         FROM protocol
        WHERE key = $1`,
      [key]
    );

    if (protoR.rows.length === 0) {
      return res.status(404).json({ msg: "Protocolo no encontrado" });
    }

    const { id, name } = protoR.rows[0];

    
    const sectionsR = await pool.query<{
      id: number;
      key: string;
      name: string;
    }>(
      `SELECT id, key, name
         FROM protocol_section
        WHERE protocol_id = $1
        ORDER BY sort_order`,
      [id]
    );

    
    const sections = await Promise.all(
      sectionsR.rows.map(async (sec) => {
        const itemsR = await pool.query<{
          key: string;
          label: string;
          score_scale: string;
          max_score: number;
        }>(
          `SELECT key, label, score_scale, max_score
             FROM protocol_item
            WHERE section_id = $1
            ORDER BY id`,
          [sec.id]
        );

        return {
          key: sec.key,
          name: sec.name,
          items: itemsR.rows,
        };
      })
    );

    
    res.json({ key, name, sections });
  } catch (err) {
    next(err);
  }
};
