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
      student_id,
      studentIds // Nuevo campo para múltiples estudiantes
    } = req.body;

    logger.info('Datos extraídos del body', { 
      title, 
      description, 
      url, 
      type, 
      size_bytes, 
      mime_type,
      student_id,
      studentIds 
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

    // Validar que no se envíen ambos campos a la vez
    if (student_id !== undefined && studentIds !== undefined) {
      res.status(400).json({
        success: false,
        message: "No se puede especificar tanto student_id como studentIds al mismo tiempo"
      });
      return;
    }

    // Manejar múltiples estudiantes
    if (studentIds !== undefined) {
      if (!Array.isArray(studentIds)) {
        res.status(400).json({
          success: false,
          message: "studentIds debe ser un array"
        });
        return;
      }

      // Validar que todos los estudiantes existan
      if (studentIds.length > 0) {
        const studentCheck = await pool.query(
          "SELECT id FROM users WHERE id = ANY($1) AND role = 'estudiante'",
          [studentIds]
        );

        if (studentCheck.rowCount !== studentIds.length) {
          const existingIds = studentCheck.rows.map(row => row.id);
          const missingIds = studentIds.filter(id => !existingIds.includes(id));
          
          res.status(404).json({
            success: false,
            message: `Los siguientes estudiantes no existen: ${missingIds.join(', ')}`
          });
          return;
        }
      }

      // Crear materiales para cada estudiante
      const results = [];
      
      for (const studentId of studentIds) {
        const query = `
          INSERT INTO material (
            student_id, type, title, description, url, size_bytes, mime_type, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8
          ) RETURNING *
        `;

        const values = [
          studentId,
          type,
          title,
          description || null,
          url,
          size_bytes || null,
          mime_type || null,
          req.user?.id
        ];

        const { rows } = await pool.query(query, values);
        results.push(rows[0]);
      }

      res.status(201).json({
        success: true,
        message: `Material creado exitosamente para ${studentIds.length} estudiantes`,
        data: results
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
        student_id, type, title, description, url, size_bytes, mime_type, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING *
    `;

    const values = [
      student_id || null,
      type,
      title,
      description || null,
      url,
      size_bytes || null,
      mime_type || null,
      req.user?.id
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