import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import logger from "../../config/logger";

// Configurar ffmpeg con la ruta del binario instalado
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Procesa un video con FFmpeg para recortarlo
 * @param inputPath Ruta del archivo de entrada
 * @param outputPath Ruta donde se guardará el archivo procesado
 * @returns Promise que se resuelve cuando termina el procesamiento
 */
export const processVideo = async (
  inputPath: string,
  outputPath: string
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-vf", "crop=iw*0.8:ih*0.8",
        "-c:a", "copy"
      ])
      .output(outputPath)
      .on("end", () => {
        logger.info(`Video recortado exitosamente: ${outputPath}`);
        resolve();
      })
      .on("error", (err) => {
        logger.error(`Error al recortar el video: ${err.message}`);
        reject(err);
      })
      .run();
  });
};
