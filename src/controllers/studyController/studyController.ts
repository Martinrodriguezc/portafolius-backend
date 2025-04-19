import { Request, Response } from "express";
import { pool } from "../../config/db";

export const getStudentStudies = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, title, protocol, status, created_at
       FROM study
       WHERE student_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ studies: result.rows });
  } catch (error) {
    console.error("Error al obtener estudios del usuario:", error);
    res.status(500).json({ msg: "Error al obtener estudios" });
  }
};
