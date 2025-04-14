import { Request, Response } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger from "../config/logger";

const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const generateUploadUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { fileName, contentType } = req.body;
  const userId = 1;

  const key = `users/${userId}/${Date.now()}_${fileName}`;

  const command = new PutObjectCommand({
    Bucket: "portafolius-videos",
    Key: key,
    ContentType: contentType,
  });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 600 });

    logger.info(`Generada URL para subir video: ${fileName}`);
    res.json({ uploadUrl: url, key });
  } catch (error) {
    logger.error("Error al generar la URL prefirmada", { error });
    res
      .status(500)
      .json({ msg: "Error al generar la URL para subir el video" });
  }
};
