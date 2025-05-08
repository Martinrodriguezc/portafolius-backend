import { Request, Response } from "express";
import { pool } from "../../config/db";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import logger from "../../config/logger";
import { processVideo } from "./cropVideo";
import { uploadFileToS3 } from "./uploadVideoS3";
import { generateUploadUrlOnly } from "./uploadVideo";

// Configurar multer para almacenar temporalmente los archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, "../../../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB máximo
}).single("video");

/**
 * Controlador principal que maneja todo el proceso:
 * 1. Recibe el archivo de video
 * 2. Lo recorta con FFmpeg
 * 3. Genera una URL de subida a S3
 * 4. Guarda la información en la base de datos
 * 5. Sube el archivo recortado a S3
 */
export const processAndUploadVideo = async (req: Request, res: Response): Promise<void> => {
  const tempFiles: string[] = [];
  
  try {
    // Paso 1: Recibir el archivo con multer
    await new Promise<void>((resolve, reject) => {
      upload(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!req.file) {
      res.status(400).json({ msg: "No se recibió ningún archivo" });
      return;
    }

    const { studyId, userId } = req.body;

    if (!studyId || !userId) {
      res.status(400).json({ msg: "Faltan parámetros requeridos (studyId o userId)" });
      return;
    }

    // Guardar las rutas de archivos temporales para limpieza posterior
    const originalFilePath = req.file.path;
    tempFiles.push(originalFilePath);
    
    const originalFilename = req.file.originalname;
    const mimeType = req.file.mimetype;
    const sizeBytes = req.file.size;
    
    // Paso 2: Recortar el video con FFmpeg
    const outputFileName = `cropped-${uuidv4()}-${path.basename(originalFilename)}`;
    const croppedFilePath = path.join(path.dirname(originalFilePath), outputFileName);
    tempFiles.push(croppedFilePath);
    
    await processVideo(originalFilePath, croppedFilePath);
    logger.info(`Video recortado exitosamente: ${croppedFilePath}`);
    
    // Paso 3: Generar key y URL para subir a S3
    const timestamp = Date.now();
    const s3Key = `users/${userId}/${timestamp}_${originalFilename}`;
    const uploadUrl = await generateUploadUrlOnly(s3Key, mimeType);
    
    // Paso 4: Insertar en la base de datos
    const insertResult = await pool.query<{ id: number }>(
      `INSERT INTO video_clip
         (study_id, object_key, original_filename, mime_type, duration_seconds, size_bytes, order_index)
       VALUES ($1, $2, $3, $4, NULL, $5, (
         SELECT COALESCE(MAX(order_index),0)+1 FROM video_clip WHERE study_id = $1
       ))
       RETURNING id`,
      [studyId, s3Key, originalFilename, mimeType, sizeBytes]
    );
    
    const clipId = insertResult.rows[0].id;
    
    // Paso 5: Subir el archivo recortado a S3
    await uploadFileToS3(croppedFilePath, mimeType, s3Key);
    logger.info(`Video subido exitosamente a S3: ${s3Key}`);
    
    // Paso 6: Responder al cliente
    res.status(200).json({
      success: true,
      clipId: clipId,
      uploadUrl: uploadUrl, // Se incluye, pero no es necesario ya que el archivo ya está subido
      message: "Video procesado y subido exitosamente"
    });
    
  } catch (error) {
    logger.error("Error en el procesamiento y subida del video:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Error al procesar y subir el video",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  } finally {
    // Limpiar archivos temporales
    for (const file of tempFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          logger.info(`Archivo temporal eliminado: ${file}`);
        }
      } catch (err) {
        logger.error(`Error al eliminar archivo temporal ${file}:`, err);
      }
    }
  }
}; 