import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger from "../../config/logger";
import { S3_CLIENT } from "../../config/s3";
import { pool } from "../../config/db";
import { config } from "../../config";
import { generateThumbnail } from "../thumbnailController/generateThumbnail";

export const generateUploadUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    fileName,
    contentType,
    studyId,
    sizeBytes,
    userId,
    protocol,
    tagIds,
  } = req.body;

  const key = `users/${userId}/${Date.now()}_${fileName}`;
  const command = new PutObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  try {
    const uploadUrl = await getSignedUrl(S3_CLIENT, command, { expiresIn: 600 });

    const insertResult = await pool.query<{ id: number }>(
      `INSERT INTO video_clip
         (study_id, object_key, original_filename, mime_type, duration_seconds,
          size_bytes, order_index, protocol)
       VALUES (
         $1, $2, $3, $4, NULL,
         $5,
         (
           SELECT COALESCE(MAX(order_index), 0) + 1
           FROM video_clip
           WHERE study_id = $1
         ),
         $6
       )
       RETURNING id`,
      [studyId, key, fileName, contentType, sizeBytes, protocol]
    );

    const clipId = insertResult.rows[0].id;
    logger.info(`Clip creado (ID ${clipId}) con protocolo "${protocol}".`);
    // 4) Devolver URL y clipId al cliente
    res.json({ uploadUrl, clipId, key });
  } catch (error) {
    logger.error("Error al generar la URL prefirmada o insertar clip:", { error });
    res
      .status(500)
      .json({ msg: "Error al generar la URL para subir el video" });
  }
};

export const uploadCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { key, videoId } = req.body;

  try {
      await generateThumbnail(key);
      res.json({ success: true, thumbnailKey: key.replace('videos/', 'videos/thumbnails/').replace('.mp4', '.jpg') });
  } catch (err) {
      console.error('Error al generar thumbnail:', err);
      res.status(500).json({ message: 'No se pudo generar la miniatura' });
  }
};