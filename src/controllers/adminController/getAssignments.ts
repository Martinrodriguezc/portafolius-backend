import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const getAssignments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT 
        ts.id as assignment_id,
        ts.teacher_id,
        ts.student_id,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        t.role as teacher_role,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        ts.assigned_at
      FROM teacher_student ts
      JOIN users t ON t.id = ts.teacher_id
      JOIN users s ON s.id = ts.student_id
      ORDER BY ts.assigned_at DESC`
    );

    const assignments = result.rows.map(row => ({
      id: row.assignment_id,
      teacher: {
        id: row.teacher_id,
        firstName: row.teacher_first_name,
        lastName: row.teacher_last_name,
        fullName: `${row.teacher_first_name} ${row.teacher_last_name}`,
        role: row.teacher_role,
        roleText: row.teacher_role === 'admin' ? 'Administrador' : 'Profesor'
      },
      student: {
        id: row.student_id,
        firstName: row.student_first_name,
        lastName: row.student_last_name,
        fullName: `${row.student_first_name} ${row.student_last_name}`
      },
      assignedAt: row.assigned_at
    }));

    
    logger.info("Lista de asignaciones instructor-estudiante obtenida exitosamente");
    res.status(200).json({ assignments });

  } catch (error) {
    logger.error("Error al obtener las asignaciones instructor-estudiante:", error);
    res.status(500).json({ msg: "Error al obtener las asignaciones instructor-estudiante" });
  }
}; 