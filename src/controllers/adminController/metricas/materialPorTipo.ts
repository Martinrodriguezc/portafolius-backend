import { Request, Response } from 'express';
import { pool } from '../../../config/db';
import logger from '../../../config/logger';

/**
 * Obtiene la cantidad de material subido por tipo (document, video, link)
 */
export const getMaterialPorTipo = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        type as tipo,
        COUNT(*) as cantidad
      FROM 
        material
      GROUP BY 
        type
      ORDER BY 
        cantidad DESC
    `;
    
    const result = await pool.query(query);
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error al obtener material por tipo', { error });
    res.status(500).json({
      success: false,
      message: 'Error al obtener material por tipo',
      error: (error as Error).message
    });
  }
}; 