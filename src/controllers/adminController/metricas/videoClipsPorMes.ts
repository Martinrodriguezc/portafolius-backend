import { Request, Response } from 'express';
import { pool } from '../../../config/db';
import logger from '../../../config/logger';

/**
 * Obtiene la cantidad de video_clips subidos por mes en los últimos 6 meses
 */
export const getVideoClipsPorMes = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        TO_CHAR(upload_date, 'YYYY-MM') as mes,
        COUNT(*) as cantidad
      FROM 
        video_clip
      WHERE 
        upload_date >= NOW() - INTERVAL '6 months'
      GROUP BY 
        TO_CHAR(upload_date, 'YYYY-MM')
      ORDER BY 
        mes
    `;
    
    const result = await pool.query(query);
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error al obtener video_clips por mes', { error });
    res.status(500).json({
      success: false,
      message: 'Error al obtener video_clips subidos por mes',
      error: (error as Error).message
    });
  }
}; 