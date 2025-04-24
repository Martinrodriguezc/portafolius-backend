import { Request, Response } from "express";
import { pool } from "../../config/db";

export const getTeacherStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  const teacherId = Number(req.params.teacherId);
  try {
    const pendingRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
         FROM evaluation_form ef
        WHERE ef.teacher_id = $1
          AND ef.score IS NULL`,
      [teacherId]
    );
    const evaluatedRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
         FROM evaluation_form ef
        WHERE ef.teacher_id = $1
          AND DATE(ef.submitted_at) = CURRENT_DATE
          AND ef.score IS NOT NULL`,
      [teacherId]
    );
    const studentRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
         FROM users u
        WHERE u.role = 'estudiante'`
    );

    const pendingCount   = pendingRes.rows[0]?.count   ?? "0";
    const evaluatedToday = evaluatedRes.rows[0]?.count ?? "0";
    const studentCount   = studentRes.rows[0]?.count   ?? "0";

    res.json({
      pendingCount:   parseInt(pendingCount,   10),
      evaluatedToday: parseInt(evaluatedToday, 10),
      studentCount:   parseInt(studentCount,   10),
    });
  } catch (error) {
    console.error("Error fetching teacher stats:", error);
    res.status(500).json({ msg: "Error fetching teacher stats" });
  }
};