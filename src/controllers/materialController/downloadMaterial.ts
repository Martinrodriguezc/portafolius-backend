import { RequestHandler } from "express";
import path from "path";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const downloadMaterial: RequestHandler<{ id: string }> = async (req, res, next) => {
  const materialId = parseInt(req.params.id, 10);
  if (isNaN(materialId)) {
    res.status(400).json({ msg: "ID inválido" });
    return;
  }

  try {
    const { rows } = await pool.query<{
      url: string;
      mime_type: string;
      file_data: Buffer;
    }>(
      `SELECT url, mime_type, file_data FROM material WHERE id = $1`,
      [materialId]
    );
    if (rows.length === 0) {
      res.status(404).json({ msg: "Material no encontrado" });
      return;
    }

    const { url, mime_type, file_data } = rows[0];

    let filename = path.basename(url).split("?")[0];

    filename = filename
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");       

    const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    res.setHeader("Content-Type", mime_type);
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);

    res.send(file_data);
  } catch (err) {
    logger.error("Error descargando material:", err);
    next(err);
  }
};