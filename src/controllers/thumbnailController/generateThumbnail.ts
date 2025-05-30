import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { config } from '../../config';

ffmpeg.setFfmpegPath(ffmpegStatic as string);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const s3 = new AWS.S3();
const BUCKET = config.S3_BUCKET!;
if (!BUCKET) throw new Error('La variable de entorno S3_BUCKET no está definida');

export async function generateThumbnail(key: string): Promise<string> {
    const tmpVideo = `/tmp/${path.basename(key)}`;
    const { Body } = await s3.getObject({ Bucket: BUCKET, Key: key }).promise();
    if (!Body) throw new Error('No se pudo obtener el objeto S3 para generar el thumbnail');
    fs.writeFileSync(tmpVideo, Body as Buffer);

    const ext = path.extname(key);
    const baseName = path.basename(key, ext);
    const tmpThumb = `/tmp/thumb-${baseName}.jpg`;

    await new Promise<void>((resolve, reject) => {
        ffmpeg(tmpVideo)
            .screenshots({
                timestamps: ['50%'],
                filename: path.basename(tmpThumb),
                folder: '/tmp',
                size: '320x240',
            })
            .on('end', () => resolve())
            .on('error', (err) => reject(err));
    });

    const thumbBuffer = fs.readFileSync(tmpThumb);

    const thumbKey = key
        .replace(/^users\//, 'users/thumbnails/')
        .replace(ext, '.jpg');

    await s3.putObject({
        Bucket: BUCKET,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: 'image/jpeg'
    }).promise();

    fs.unlinkSync(tmpVideo);
    fs.unlinkSync(tmpThumb);

    console.log(`Thumbnail generado en s3://${BUCKET}/${thumbKey}`);
    return thumbKey;
}
