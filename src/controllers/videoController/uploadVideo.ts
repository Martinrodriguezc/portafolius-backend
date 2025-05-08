import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger from "../../config/logger";
import { S3_CLIENT } from "../../config/s3";
import { pool } from "../../config/db";
import { config } from "../../config";

/**
 * Genera una URL firmada para subir un archivo a S3 sin realizar ninguna operación en la base de datos
 * @param key Clave S3 donde se subirá el archivo
 * @param contentType Tipo MIME del archivo
 * @returns URL firmada para subir el archivo
 */
export const generateUploadUrlOnly = async (
  key: string,
  contentType: string
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: config.S3_BUCKET || "portafolius-videos",
    Key: key,
    ContentType: contentType,
  });

  try {
    const url = await getSignedUrl(S3_CLIENT, command, { expiresIn: 600 });
    return url;
  } catch (error) {
    logger.error("Error al generar la URL prefirmada", { error });
    throw new Error("Error al generar la URL para subir el video");
  }
};

/**
 * Controlador que genera una URL para subir un archivo a S3 y registra la información en la base de datos
 */
export const generateUploadUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { fileName, contentType, studyId, sizeBytes, userId } = req.body;

  const key = `users/${userId}/${Date.now()}_${fileName}`;

  try {
    const url = await generateUploadUrlOnly(key, contentType);

    const insertResult = await pool.query<{
      id: number;
    }>(
      `INSERT INTO video_clip
         (study_id, object_key, original_filename, mime_type, duration_seconds, size_bytes, order_index)
       VALUES ($1, $2, $3, $4, NULL, $5, (
         SELECT COALESCE(MAX(order_index),0)+1 FROM video_clip WHERE study_id = $1
       ))
       RETURNING id`,
      [studyId, key, fileName, contentType, sizeBytes]
    );

    const clipId = insertResult.rows[0].id;
    logger.info(`Generada URL para subir video: ${fileName}`);
    res.json({ uploadUrl: url, clipId });
  } catch (error) {
    logger.error("Error al generar la URL prefirmada", { error });
    res
      .status(500)
      .json({ msg: "Error al generar la URL para subir el video" });
  }
};

