import { Request, Response } from 'express';
import AWS from 'aws-sdk';
import { pool } from '../../config/db';
import { config } from '../../config';

const s3 = new AWS.S3({
    region: config.AWS_REGION,
    signatureVersion: 'v4',
});

const BUCKET = config.S3_BUCKET!;
if (!BUCKET) throw new Error('S3_BUCKET no configurado');

export const getThumbnailDownloadUrl = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const videoId = Number(req.params.videoId);
        if (isNaN(videoId)) {
            res.status(400).json({ message: 'videoId inválido' });
            return;
        }

        const { rows } = await pool.query<{ object_key: string }>(
            'SELECT object_key FROM video_clip WHERE id = $1',
            [videoId]
        );

        const videoKey = rows[0]?.object_key;
        if (!videoKey) {
            res.status(404).json({ message: 'Vídeo no encontrado' });
            return;
        }

        const ext = videoKey.slice(videoKey.lastIndexOf('.'));
        const thumbKey = videoKey
            .replace(/^users\//, 'users/thumbnails/')
            .replace(ext, '.jpg');

        const url = await s3.getSignedUrlPromise('getObject', {
            Bucket: BUCKET,
            Key: thumbKey,
            Expires: 60 * 5,
        });
        console.log(url)

        res.json({ url });
    } catch (err: any) {
        console.error('Error al generar URL de descarga de thumbnail:', err);
        res.status(500).json({ message: 'Error interno' });
    }
};
