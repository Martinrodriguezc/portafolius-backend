import { RequestHandler } from 'express';
import path from 'path';
import { pool } from '../../config/db';
import logger from '../../config/logger';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3_CLIENT } from '../../config/s3';

export const downloadMaterial: RequestHandler<{ id: string }> = async (
  req,
  res,
  next
) => {
  const materialId = parseInt(req.params.id, 10);
  if (isNaN(materialId)) {
    res.status(400).json({ msg: 'ID inválido' });
    return;
  }

  try {

    const { rows } = await pool.query<{ url: string; mime_type: string }>(
      `SELECT url, mime_type FROM material WHERE id = $1`,
      [materialId]
    );
    if (rows.length === 0) {
      res.status(404).json({ msg: 'Material no encontrado' });
      return;
    }
    const key = rows[0].url;
    const mime_type = rows[0].mime_type;


    let filename = path
      .basename(key)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.\-_]/g, '_');


    const getCmd = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ResponseContentType: mime_type,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    });


    const signedUrl = await getSignedUrl(S3_CLIENT, getCmd, { expiresIn: 300 });


    res.redirect(signedUrl);
  } catch (err) {
    logger.error('Error downloading material:', err);
    next(err);
  }
};