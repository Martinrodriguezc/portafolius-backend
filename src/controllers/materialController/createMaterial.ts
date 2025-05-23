import { RequestHandler } from "express";
import multer from "multer";
import { pool } from "../../config/db";
import logger from "../../config/logger";
import { AuthenticatedRequest } from "../../middleware/authenticateToken";

export const upload = multer({ storage: multer.memoryStorage() });

export const createMaterial: RequestHandler = async (
  req: AuthenticatedRequest & { file?: Express.Multer.File },
  res,
  next
): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const { type, title, description, url: linkUrl } = req.body;
    const studentIds: number[] = req.body.studentIds
      ? JSON.parse(req.body.studentIds)
      : [];

    let url: string;
    let size: number | null = null;
    let mime_type: string | null = null;
    let buffer: Buffer | null = null;

    if (type === "link") {
      if (!linkUrl) {
        res.status(400).json({ msg: "Falta URL para enlace" });
        return;
      }
      url = linkUrl;
    } else {
      if (!req.file) {
        res.status(400).json({ msg: "Falta archivo adjunto" });
        return;
      }
      const { originalname, mimetype, size: fsize, buffer: fbuffer } = req.file;
      const safeName = originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      url = `/materials/download/${Date.now()}-${safeName}`;
      size = fsize;
      mime_type = mimetype;
      buffer = fbuffer;
    }

    const insert = await pool.query<{ id: number }>(
      `
      INSERT INTO material
        (student_id, type, title, description, url, size_bytes, mime_type, created_by, file_data)
      VALUES
        (NULL, $1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
      `,
      [type, title, description, url, size, mime_type, teacherId, buffer]
    );
    const materialId = insert.rows[0].id;

    for (const sid of studentIds) {
      await pool.query(
        `
        INSERT INTO material_assignment
          (material_id, student_id, assigned_by)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        `,
        [materialId, sid, teacherId]
      );
    }

    res.status(201).json({ materialId, url });
  } catch (err) {
    logger.error("Error creating material:", err);
    next(err);
  }
};