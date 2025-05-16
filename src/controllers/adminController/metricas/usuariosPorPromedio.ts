import { Request, Response } from 'express';
import { pool } from '../../../config/db';
import logger from '../../../config/logger';

/**
 * Obtiene los usuarios con mejor y peor promedio de nota, basado en evaluation_form.score
 */
export const getUsuariosPorPromedio = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      WITH promedios_usuarios AS (
        SELECT 
          s.student_id,
          u.first_name,
          u.last_name,
          ROUND(AVG(ef.score)::numeric, 1) as promedio,
          COUNT(ef.id) as cantidad_evaluaciones
        FROM 
          evaluation_form ef
          JOIN study s ON ef.study_id = s.id
          JOIN users u ON s.student_id = u.id
        WHERE 
          ef.score IS NOT NULL
        GROUP BY 
          s.student_id, u.first_name, u.last_name
        HAVING 
          COUNT(ef.id) > 0
      ),
      top_usuarios AS (
        SELECT 
          student_id as id,
          CONCAT(first_name, ' ', last_name) as nombre_completo,
          promedio,
          cantidad_evaluaciones
        FROM 
          promedios_usuarios
        ORDER BY 
          promedio DESC
        LIMIT 10
      ),
      bottom_usuarios AS (
        SELECT 
          student_id as id,
          CONCAT(first_name, ' ', last_name) as nombre_completo,
          promedio,
          cantidad_evaluaciones
        FROM 
          promedios_usuarios
        ORDER BY 
          promedio ASC
        LIMIT 5
      )
      SELECT 
        'top' as tipo,
        *
      FROM 
        top_usuarios
      UNION ALL
      SELECT 
        'bottom' as tipo,
        *
      FROM 
        bottom_usuarios
    `;
    
    const result = await pool.query(query);
    
    // Separar los resultados en dos grupos: top y bottom
    const topUsuarios = result.rows.filter(row => row.tipo === 'top');
    const bottomUsuarios = result.rows.filter(row => row.tipo === 'bottom');
    
    res.status(200).json({
      success: true,
      data: {
        top_usuarios: topUsuarios.map(usuario => ({
          id: usuario.id,
          nombre_completo: usuario.nombre_completo,
          promedio: usuario.promedio,
          cantidad_evaluaciones: usuario.cantidad_evaluaciones
        })),
        bottom_usuarios: bottomUsuarios.map(usuario => ({
          id: usuario.id,
          nombre_completo: usuario.nombre_completo,
          promedio: usuario.promedio,
          cantidad_evaluaciones: usuario.cantidad_evaluaciones
        }))
      }
    });
  } catch (error) {
    logger.error('Error al obtener usuarios por promedio', { error });
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios por promedio de notas',
      error: (error as Error).message
    });
  }
}; 