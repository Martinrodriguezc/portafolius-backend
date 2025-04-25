import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const getAllTags = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Consultar todos los tags ordenados por nombre
    const result = await pool.query(
      `SELECT id, name, created_by 
       FROM tag 
       ORDER BY name ASC`
    );

    logger.info(`Se obtuvieron ${result.rowCount} tags`);
    res.status(200).json({
      success: true,
      tags: result.rows,
    });
  } catch (error) {
    logger.error("Error al obtener los tags", { error });
    res.status(500).json({
      success: false,
      msg: "Error al obtener los tags",
    });
  }
};
