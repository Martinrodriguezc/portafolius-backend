import { PutObjectCommand } from "@aws-sdk/client-s3";
import { S3_CLIENT } from "../../config/s3";
import { config } from "../../config";
import fs from "fs";
import logger from "../../config/logger";

/**
 * Sube un archivo local a Amazon S3
 * @param filePath Ruta local del archivo a subir
 * @param contentType Tipo MIME del archivo
 * @param s3Key Clave (path) donde se guardará en S3
 * @returns Promise con la clave del objeto subido
 */
export const uploadFileToS3 = async (
  filePath: string,
  contentType: string,
  s3Key: string
): Promise<string> => {
  try {
    // Leer el archivo
    const fileContent = fs.readFileSync(filePath);
    
    // Configurar comando para subir a S3
    const command = new PutObjectCommand({
      Bucket: config.S3_BUCKET || "portafolius-videos",
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType
    });
    
    // Enviar archivo a S3
    await S3_CLIENT.send(command);
    logger.info(`Archivo subido exitosamente a S3: ${s3Key}`);
    
    return s3Key;
  } catch (error) {
    logger.error(`Error al subir archivo a S3: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    throw new Error(`Error al subir archivo a S3: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

export const generateCroppedVideoKey = (
  userId: string, 
  originalFilename: string
): string => {
  const timestamp = Date.now();
  return `users/${userId}/cropped/${timestamp}_${originalFilename}`;
}; 