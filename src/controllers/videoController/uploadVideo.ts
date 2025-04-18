import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger from "../../config/logger";
import { S3_CLIENT } from "../../config/s3";

export const generateUploadUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { fileName, contentType } = req.body;
  const userId = 1;

  //Revisar para que se pueda dejar cada user en 1 carpeta, probablemente haya que codificar en el front y luego decodificar en la descarga en el backend
  const key = `users/${userId}/${Date.now()}_${fileName}`;

  const command = new PutObjectCommand({
    Bucket: "portafolius-videos",
    Key: key,
    ContentType: contentType,
  });

  try {
    const url = await getSignedUrl(S3_CLIENT, command, { expiresIn: 600 });

    logger.info(`Generada URL para subir video: ${fileName}`);
    res.json({ uploadUrl: url, key });
  } catch (error) {
    logger.error("Error al generar la URL prefirmada", { error });
    res
      .status(500)
      .json({ msg: "Error al generar la URL para subir el video" });
  }
};
