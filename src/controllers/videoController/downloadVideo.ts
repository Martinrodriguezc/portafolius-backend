// src/controllers/video.ts

import { Request, Response } from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3_CLIENT } from "../../config/s3";
import { pool } from "../../config/db";
import { config } from "../../config";

export const generateDownloadUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { clipId } = req.params;
    const { rows } = await pool.query<{ object_key: string }>(
      "SELECT object_key FROM video_clip WHERE id = $1",
      [clipId]
    );
    if (rows.length === 0) {
      res.status(404).json({ msg: "Video clip no encontrado" });
      return;
    }
    const key = rows[0].object_key;

    const command = new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
    });
    const downloadUrl = await getSignedUrl(S3_CLIENT, command, {
      expiresIn: 600,
    });

    res.json({ downloadUrl });
  } catch (error) {
    console.error("Error generando URL de descarga:", error);
    res.status(500).json({ msg: "Error al generar la URL de descarga" });
  }
};
