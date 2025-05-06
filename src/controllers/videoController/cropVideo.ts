import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { S3_CLIENT } from "../../config/s3";
import { pool } from "../../config/db";
import { config } from "../../config";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import * as ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import logger from "../../config/logger";

// Declaraciones simplificadas para tipos
declare module "multer" { }
declare module "fluent-ffmpeg" { }
declare module "@ffmpeg-installer/ffmpeg" { }

// Extender Request para incluir file
declare global {
  namespace Express {
    interface Request {
      file?: {
        path: string;
        mimetype: string;
        originalname: string;
      };
    }
  }
}

// Configurar ffmpeg con la ruta del binario instalado
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

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

export const cropVideo = async (req: Request, res: Response): Promise<void> => {
  const tempFiles: string[] = [];

  try {
    // Usar multer para subir el archivo
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

    const { clipId, userId } = req.body;

    if (!clipId || !userId) {
      res.status(400).json({ msg: "Faltan parámetros requeridos (clipId o userId)" });
      return;
    }

    // Guardar la ruta del archivo original para limpieza posterior
    const originalFilePath = req.file.path;
    tempFiles.push(originalFilePath);

    // Obtener información del clip original desde la base de datos
    const { rows } = await pool.query<{ original_filename: string }>(
      "SELECT original_filename FROM video_clip WHERE id = $1",
      [clipId]
    );

    if (rows.length === 0) {
      res.status(404).json({ msg: "Video clip no encontrado" });
      return;
    }

    const originalFilename = rows[0].original_filename;
    
    // Crear nombre para el archivo procesado
    const outputFileName = `cropped-${uuidv4()}-${path.basename(originalFilename)}`;
    const outputFilePath = path.join(path.dirname(originalFilePath), outputFileName);
    tempFiles.push(outputFilePath);

    // Procesar el video con ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(originalFilePath)
        .outputOptions([
          "-vf", "crop=iw*0.8:ih*0.8", // Recortar al 80% centrado
          "-c:a", "copy" // Copiar el audio sin cambios
        ])
        .output(outputFilePath)
        .on("end", () => {
          logger.info(`Video recortado exitosamente: ${outputFilePath}`);
          resolve();
        })
        .on("error", (err) => {
          logger.error(`Error al recortar el video: ${err.message}`);
          reject(err);
        })
        .run();
    });

    // Subir a S3
    const timestamp = Date.now();
    const s3Key = `users/${userId}/cropped/${timestamp}_${originalFilename}`;
    
    // Leer el archivo procesado
    const fileContent = fs.readFileSync(outputFilePath);
    
    // Subir a S3
    const command = new PutObjectCommand({
      Bucket: config.S3_BUCKET || "portafolius-videos", // Usar bucket por defecto si no está en config
      Key: s3Key,
      Body: fileContent,
      ContentType: req.file.mimetype
    });
    
    await S3_CLIENT.send(command);
    
    // Verificar si la columna has_been_cropped existe, si no, agregarla
    try {
      await pool.query(
        `ALTER TABLE video_clip 
         ADD COLUMN IF NOT EXISTS has_been_cropped BOOLEAN DEFAULT FALSE,
         ADD COLUMN IF NOT EXISTS cropped_object_key TEXT`
      );
    } catch (error) {
      logger.error("Error al verificar columnas en la tabla:", error);
      // Continuamos de todas formas
    }
    
    // Actualizar la base de datos
    await pool.query(
      `UPDATE video_clip 
       SET has_been_cropped = true, 
           cropped_object_key = $1 
       WHERE id = $2`,
      [s3Key, clipId]
    );
    
    // Responder al cliente
    res.status(200).json({
      success: true,
      message: "Video recortado y subido exitosamente",
      croppedKey: s3Key
    });
    
  } catch (error) {
    logger.error("Error en el proceso de recorte de video:", error);
    res.status(500).json({ 
      success: false, 
      msg: "Error al procesar el video",
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
