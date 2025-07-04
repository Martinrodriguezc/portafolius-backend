import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../config/db";
import logger from "../../config/logger";
import { UpdateUserRequestPayload } from "../../types/user";

export const updateUserByAdmin = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const payload = req.body as UpdateUserRequestPayload;
  
  if (!payload.user || !payload.updateData) {
    logger.warn("Formato de petición inválido");
    res.status(400).json({ msg: "Formato de petición inválido" });
    return;
  }

  if (payload.user.role !== 'admin') {
    logger.warn(`Acceso denegado: usuario no es administrador. User ID: ${payload.user.id}`);
    res.status(403).json({ msg: "Acceso denegado. Solo administradores pueden actualizar usuarios." });
    return;
  }

  const updateData = payload.updateData;

  // Validar que al menos un campo esté presente
  if (!updateData.first_name && !updateData.last_name && !updateData.email && !updateData.password && !updateData.role) {
    logger.warn("No se proporcionaron campos para actualizar");
    res.status(400).json({ msg: "Debe proporcionar al menos un campo para actualizar" });
    return;
  }

  // Validar formato de email si se proporciona
  if (updateData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
    logger.warn(`Formato de email inválido: ${updateData.email}`);
    res.status(400).json({ msg: "Formato de email inválido" });
    return;
  }

  // Validar rol si se proporciona
  if (updateData.role && !['profesor', 'estudiante', 'admin'].includes(updateData.role)) {
    logger.warn(`Rol incorrecto proporcionado: ${updateData.role}`);
    res.status(400).json({ msg: "Rol no válido. Los roles permitidos son: profesor, estudiante, admin" });
    return;
  }

  try {
    // Verificar que el usuario existe
    const userExists = await pool.query("SELECT 1 FROM users WHERE id = $1", [id]);
    if (userExists.rows.length === 0) {
      logger.warn(`Usuario no encontrado para actualizar, ID: ${id}`);
      res.status(404).json({ msg: "Usuario no encontrado" });
      return;
    }

    // Verificar que el email no esté en uso por otro usuario (si se está cambiando)
    if (updateData.email) {
      const emailExists = await pool.query(
        "SELECT 1 FROM users WHERE email = $1 AND id != $2",
        [updateData.email, id]
      );
      if (emailExists.rows.length > 0) {
        logger.warn(`El email ya está en uso por otro usuario: ${updateData.email}`);
        res.status(400).json({ msg: "El email ya está en uso por otro usuario" });
        return;
      }
    }

    // Preparar los campos para actualizar
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.first_name) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(updateData.first_name);
    }

    if (updateData.last_name) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(updateData.last_name);
    }

    if (updateData.email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(updateData.email);
    }

    if (updateData.role) {
      updates.push(`role = $${paramIndex++}`);
      values.push(updateData.role);
    }

    if (updateData.password) {
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      updates.push(`password = $${paramIndex++}`);
      values.push(hashedPassword);
    }

    // Añadir el ID al final
    values.push(id);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, first_name, last_name, email, role, created_at
    `;

    const result = await pool.query(query, values);

    logger.info(`Usuario actualizado por administrador: ID ${id}, campos: ${updates.join(', ')}`);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error(`Error al actualizar usuario por administrador, ID: ${id}`, { error });
    res.status(500).json({ msg: "Error al actualizar usuario" });
  }
}; 