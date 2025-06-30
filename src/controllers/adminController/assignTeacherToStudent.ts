import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const assignTeacherToStudent = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { teacherEmail, studentEmail } = req.body;

  if (!teacherEmail || !studentEmail) {
    res.status(400).json({ msg: "Se requieren los correos del profesor y del estudiante" });
    return;
  }

  try {
    // Primero verificamos que ambos usuarios existan y tengan los roles correctos
    const usersResult = await pool.query(
      `SELECT id, email, role 
       FROM users 
       WHERE email IN ($1, $2)`,
      [teacherEmail, studentEmail]
    );

    if (usersResult.rows.length !== 2) {
      res.status(404).json({ msg: "Uno o ambos usuarios no existen" });
      return;
    }

    const teacher = usersResult.rows.find(user => user.email === teacherEmail);
    const student = usersResult.rows.find(user => user.email === studentEmail);

    if (!teacher || teacher.role !== 'profesor') {
      res.status(400).json({ msg: "El correo proporcionado no corresponde a un profesor" });
      return;
    }

    if (!student || student.role !== 'estudiante') {
      res.status(400).json({ msg: "El correo proporcionado no corresponde a un estudiante" });
      return;
    }

    // Verificar si el estudiante ya tiene un profesor asignado
    const existingAssignment = await pool.query(
      `SELECT teacher_id, t.email as teacher_email
       FROM teacher_student ts
       JOIN users t ON t.id = ts.teacher_id
       WHERE student_id = $1`,
      [student.id]
    );

    if (existingAssignment.rows.length > 0) {
      // Actualizar la asignación existente
      await pool.query(
        `UPDATE teacher_student 
         SET teacher_id = $1, assigned_at = CURRENT_TIMESTAMP
         WHERE student_id = $2`,
        [teacher.id, student.id]
      );

      logger.info(`Actualizada asignación: estudiante ${studentEmail} reasignado del profesor ${existingAssignment.rows[0].teacher_email} al profesor ${teacherEmail}`);
      res.status(200).json({ 
        msg: "Asignación actualizada exitosamente",
        teacherId: teacher.id,
        studentId: student.id,
        previousTeacherEmail: existingAssignment.rows[0].teacher_email
      });
    } else {
      // Crear nueva asignación
      await pool.query(
        `INSERT INTO teacher_student (teacher_id, student_id)
         VALUES ($1, $2)`,
        [teacher.id, student.id]
      );

      logger.info(`Nueva asignación: Profesor ${teacherEmail} asignado al estudiante ${studentEmail}`);
      res.status(201).json({ 
        msg: "Profesor asignado exitosamente al estudiante",
        teacherId: teacher.id,
        studentId: student.id
      });
    }

  } catch (error) {
    logger.error("Error al asignar profesor a estudiante:", error);
    res.status(500).json({ msg: "Error al asignar profesor a estudiante" });
  }
}; 