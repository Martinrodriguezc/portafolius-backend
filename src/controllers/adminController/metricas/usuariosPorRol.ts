import { Request, Response } from 'express';
import { pool } from '../../../config/db';
import logger from '../../../config/logger';

/**
 * Obtiene el número total de usuarios agrupado por rol
 */
export const getUsuariosPorRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT role, COUNT(*) as cantidad 
      FROM users 
      GROUP BY role 
      ORDER BY cantidad DESC
    `;
    
    const result = await pool.query(query);
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error al obtener usuarios por rol', { error });
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios por rol',
      error: (error as Error).message
    });
  }
}; 