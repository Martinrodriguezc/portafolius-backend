import { Request, Response } from 'express';
import { pool } from '../../../config/db';
import logger from '../../../config/logger';

/**
 * Obtiene el número total de estudios creados por mes en los últimos 6 meses
 */
export const getEstudiosPorMes = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as mes,
        COUNT(*) as cantidad
      FROM 
        study
      WHERE 
        created_at >= NOW() - INTERVAL '6 months'
      GROUP BY 
        TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY 
        mes
    `;
    
    const result = await pool.query(query);
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error al obtener estudios por mes', { error });
    res.status(500).json({
      success: false,
      message: 'Error al obtener estudios creados por mes',
      error: (error as Error).message
    });
  }
}; 