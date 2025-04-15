import { Request, Response } from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3_CLIENT } from "../../config/s3";

export const generateDownloadUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { key } = req.params;

  const command = new GetObjectCommand({
    Bucket: "portafolius-videos",
    Key: key,
  });

  try {
    const url = await getSignedUrl(S3_CLIENT, command, { expiresIn: 600 });
    res.json({ downloadUrl: url });
  } catch (error) {
    res.status(500).json({ msg: "Error al generar la URL de descarga" });
  }
};
