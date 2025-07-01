import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";
import { AuthenticatedRequest } from "../../middleware/authenticateToken";


export async function uploadMaterial(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.info('Iniciando uploadMaterial', { 
      userId: req.user?.id, 
      userRole: req.user?.role,
      body: req.body 
    });

    const { 
      title, 
      description, 
      url, 
      type, 
      size_bytes, 
      mime_type,
      student_id 
    } = req.body;

    logger.info('Datos extraídos del body', { 
      title, 
      description, 
      url, 
      type, 
      size_bytes, 
      mime_type,
      student_id 
    });

    // Validar que el tipo sea válido
    if (!['document', 'video', 'link'].includes(type)) {
      logger.warn('Tipo de material inválido', { type });
      res.status(400).json({
        success: false,
        message: "El tipo de material debe ser 'document', 'video' o 'link'"
      });
      return;
    }

    // Validar campos obligatorios
    if (!title || !url || !type) {
      res.status(400).json({
        success: false,
        message: "Los campos título, URL y tipo son obligatorios"
      });
      return;
    }

    // Si se proporciona un student_id, verificar que exista
    if (student_id) {
      const studentCheck = await pool.query(
        "SELECT id FROM users WHERE id = $1 AND role = 'estudiante'",
        [student_id]
      );

      if (studentCheck.rowCount === 0) {
        res.status(404).json({
          success: false,
          message: "El estudiante especificado no existe"
        });
        return;
      }
    }

    // Insertar el material en la base de datos
    const query = `
      INSERT INTO material (
        student_id, type, title, description, url, size_bytes, mime_type
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `;

    const values = [
      student_id || null,
      type,
      title,
      description || null,
      url,
      size_bytes || null,
      mime_type || null
    ];

    const { rows } = await pool.query(query, values);
    
    res.status(201).json({
      success: true,
      message: "Material subido exitosamente",
      data: rows[0]
    });
  } catch (error) {
    logger.error('Error al subir material', { error });
    res.status(500).json({
      success: false,
      message: 'Error al subir el material',
      error: (error as Error).message
    });
  }
} 