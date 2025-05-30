import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";
  

export const getProtocolById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM protocol WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Protocolo no encontrado" });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener protocolo:", error);
    res.status(500).json({ error: "Error al obtener protocolo" });
  }
};
export const getAllProtocols = async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM protocols");
    res.json(result.rows);
  } catch (error) {
    logger.error("Error al obtener protocolos:", error);
    res.status(500).json({ msg: "Error al obtener protocolos" });
  }
};
