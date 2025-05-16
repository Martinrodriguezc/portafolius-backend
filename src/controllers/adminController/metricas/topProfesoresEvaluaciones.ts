import { Request, Response } from 'express';
import { pool } from '../../../config/db';
import logger from '../../../config/logger';

/**
 * Obtiene el top 5 profesores con más evaluaciones realizadas
 */
export const getTopProfesoresEvaluaciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        u.id,
        CONCAT(u.first_name, ' ', u.last_name) as nombre,
        COUNT(ef.id) as evaluaciones
      FROM 
        users u
        JOIN evaluation_form ef ON u.id = ef.teacher_id
      WHERE 
        u.role = 'profesor'
      GROUP BY 
        u.id, u.first_name, u.last_name
      ORDER BY 
        evaluaciones DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query);
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error al obtener top profesores con más evaluaciones', { error });
    res.status(500).json({
      success: false,
      message: 'Error al obtener top profesores con más evaluaciones',
      error: (error as Error).message
    });
  }
}; 