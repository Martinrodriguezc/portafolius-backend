import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

/**
 * Actualiza un material existente en el sistema
 */
export async function updateMaterial(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const materialId = parseInt(req.params.id);
    const { 
      title, 
      description, 
      url, 
      type, 
      student_id 
    } = req.body;

    // Verificar que el material existe
    const materialCheck = await pool.query(
      "SELECT * FROM material WHERE id = $1",
      [materialId]
    );

    if (materialCheck.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "El material especificado no existe"
      });
      return;
    }

    // Validar que el tipo sea válido si se está actualizando
    if (type && !['document', 'video', 'link'].includes(type)) {
      res.status(400).json({
        success: false,
        message: "El tipo de material debe ser 'document', 'video' o 'link'"
      });
      return;
    }

    // Si se proporciona un student_id, verificar que exista
    if (student_id !== undefined) {
      if (student_id === null) {
        // Está bien, será un material global
      } else {
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
    }

    // Construir la query de actualización dinámicamente
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (url !== undefined) {
      updateFields.push(`url = $${paramCount}`);
      values.push(url);
      paramCount++;
    }

    if (type !== undefined) {
      updateFields.push(`type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }

    if (student_id !== undefined) {
      updateFields.push(`student_id = $${paramCount}`);
      values.push(student_id);
      paramCount++;
    }

    // Si no hay campos para actualizar
    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        message: "No se proporcionaron campos para actualizar"
      });
      return;
    }

    // Añadir el ID del material al final de los valores
    values.push(materialId);

    const query = `
      UPDATE material
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const { rows } = await pool.query(query, values);
    
    res.status(200).json({
      success: true,
      message: "Material actualizado exitosamente",
      data: rows[0]
    });
  } catch (error) {
    logger.error('Error al actualizar material', { error });
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el material',
      error: (error as Error).message
    });
  }
} 