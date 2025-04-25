import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const getTagsUtils = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const organsResult = await pool.query(`
      SELECT id, name
      FROM organ
      ORDER BY name ASC
    `);

    const structuresResult = await pool.query(`
      SELECT id, name, organ_id
      FROM structure
      ORDER BY name ASC
    `);

    const conditionsResult = await pool.query(`
      SELECT id, name, structure_id
      FROM condition
      ORDER BY name ASC
    `);

    res.status(200).json({
      success: true,
      organs: organsResult.rows,
      structures: structuresResult.rows,
      conditions: conditionsResult.rows,
    });
  } catch (error) {
    logger.error("Error al obtener la jerarquía de diagnóstico", { error });
    res.status(500).json({
      success: false,
      msg: "Error al obtener la jerarquía de diagnóstico",
    });
  }
};
