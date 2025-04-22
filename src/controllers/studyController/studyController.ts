import { Request, Response } from "express";
import { pool } from "../../config/db";

export const getStudentStudies = async (
  req: Request,
  res: Response
): Promise<void> => {
  const rawId = req.params.userId;
  const studentId = Number(rawId);
  if (isNaN(studentId)) {
    res.status(400).json({ msg: "ID de estudiante inválido" });
    return;
  }

  try {
    const result = await pool.query<{
      id: number;
      title: string;
      protocol: string | null;
      status: string;
      created_at: Date;
    }>(
      `SELECT 
         id, 
         title, 
         protocol, 
         status, 
         created_at
       FROM study
       WHERE student_id = $1
       ORDER BY created_at DESC`,
      [studentId]
    );

    res.json({ studies: result.rows });
  } catch (error) {
    console.error("Error al obtener estudios del usuario:", error);
    res
      .status(500)
      .json({ msg: "Error al obtener estudios del usuario" });
  }
};