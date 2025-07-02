import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

/**
 * Obtiene todos los materiales disponibles en el sistema
 * Accesible para profesores y administradores
 */
export async function getAllMaterials(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Consulta para obtener todos los materiales sin filtrado
    const query = `
      SELECT m.*, 
             CONCAT(u.first_name, ' ', u.last_name) as student_name
      FROM material m
      LEFT JOIN users u ON m.student_id = u.id
      ORDER BY m.uploaded_at DESC
    `;
    
    const { rows } = await pool.query(query);
    
    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    logger.error('Error al obtener todos los materiales', { error });
    res.status(500).json({
      success: false,
      message: 'Error al obtener los materiales',
      error: (error as Error).message
    });
  }
} 