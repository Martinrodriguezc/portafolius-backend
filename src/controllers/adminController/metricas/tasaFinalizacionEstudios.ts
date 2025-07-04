import { Request, Response } from 'express';
import { pool } from '../../../config/db';
import logger from '../../../config/logger';

/**
 * Obtiene la tasa de finalización de estudios (estudios evaluados / total de estudios)
 */
export const getTasaFinalizacionEstudios = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      WITH total_estudios AS (
        SELECT COUNT(*) as total FROM study
      ),
      estudios_evaluados AS (
        SELECT COUNT(DISTINCT study_id) as evaluados
        FROM evaluation_form
      )
      SELECT 
        e.evaluados,
        t.total,
        CASE
          WHEN t.total = 0 THEN 0
          ELSE ROUND((e.evaluados::numeric / t.total::numeric) * 100, 1)
        END AS tasa_finalizacion
      FROM 
        total_estudios t, estudios_evaluados e
    `;
    
    const result = await pool.query(query);
    
    res.status(200).json({
      success: true,
      data: {
        estudios_evaluados: result.rows[0].evaluados,
        total_estudios: result.rows[0].total,
        tasa_finalizacion: result.rows[0].tasa_finalizacion
      }
    });
  } catch (error) {
    logger.error('Error al obtener tasa de finalización de estudios', { error });
    res.status(500).json({
      success: false,
      message: 'Error al obtener tasa de finalización de estudios',
      error: (error as Error).message
    });
  }
}; 