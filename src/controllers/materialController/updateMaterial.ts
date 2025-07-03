import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";
import { AuthenticatedRequest } from "../../middleware/authenticateToken";

/**
 * Actualiza un material existente en el sistema
 * Puede actualizar para un estudiante específico o para múltiples estudiantes
 */
export async function updateMaterial(
  req: AuthenticatedRequest,
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
      student_id,
      student_ids // Nuevo campo para múltiples estudiantes
    } = req.body;

   
    if (isNaN(materialId)) {
      res.status(400).json({
        success: false,
        message: "ID de material inválido"
      });
      return;
    }

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

    // Validar que no se envíen ambos campos a la vez
    if (student_id !== undefined && student_ids !== undefined) {
      res.status(400).json({
        success: false,
        message: "No se puede especificar tanto student_id como student_ids al mismo tiempo"
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

    // Manejar múltiples estudiantes
    if (student_ids !== undefined) {
      if (!Array.isArray(student_ids)) {
        res.status(400).json({
          success: false,
          message: "student_ids debe ser un array"
        });
        return;
      }

      // Validar que todos los estudiantes existan
      if (student_ids.length > 0) {
        const studentCheck = await pool.query(
          "SELECT id FROM users WHERE id = ANY($1) AND role = 'estudiante'",
          [student_ids]
        );

        if (studentCheck.rowCount !== student_ids.length) {
          const existingIds = studentCheck.rows.map(row => row.id);
          const missingIds = student_ids.filter(id => !existingIds.includes(id));
          
          res.status(404).json({
            success: false,
            message: `Los siguientes estudiantes no existen: ${missingIds.join(', ')}`
          });
          return;
        }
      }

      // Crear copias del material para cada estudiante
      const results = [];
      
      for (const studentId of student_ids) {
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

        // Siempre actualizar student_id para cada estudiante
        updateFields.push(`student_id = $${paramCount}`);
        values.push(studentId);
        paramCount++;

        if (updateFields.length === 1) { // Solo student_id
          res.status(400).json({
            success: false,
            message: "No se proporcionaron campos para actualizar además de student_ids"
          });
          return;
        }

        // Primero obtener el material original
        const originalMaterial = await pool.query(
          "SELECT * FROM material WHERE id = $1",
          [materialId]
        );

        const original = originalMaterial.rows[0];

        // Crear una copia del material para este estudiante
        const insertQuery = `
          INSERT INTO material (
            student_id, type, title, description, url, size_bytes, mime_type, created_by, uploaded_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, NOW()
          ) RETURNING *
        `;

        const insertValues = [
          studentId,
          type !== undefined ? type : original.type,
          title !== undefined ? title : original.title,
          description !== undefined ? description : original.description,
          url !== undefined ? url : original.url,
          original.size_bytes,
          original.mime_type,
          original.created_by
        ];

        const { rows } = await pool.query(insertQuery, insertValues);
        results.push(rows[0]);
      }

      res.status(200).json({
        success: true,
        message: `Material copiado exitosamente para ${student_ids.length} estudiantes`,
        data: results
      });
      return;
    }

    // Lógica original para un solo estudiante
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