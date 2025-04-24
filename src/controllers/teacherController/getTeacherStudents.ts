import { Request, Response } from "express";
import { pool } from "../../config/db";

export const getTeacherStudents = async (
  req: Request,
  res: Response
): Promise<void> => {
  const teacherId = Number(req.params.teacherId);
  try {
    const { rows } = await pool.query<{
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      studies: string;
      average_score: string | null;
      last_activity: string | null;
    }>(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(s.id)                                  AS studies,
        ROUND(AVG(ef.score)::numeric, 1)             AS average_score,
        TO_CHAR(MAX(s.created_at), 'DD "de" FMMonth, YYYY') AS last_activity
      FROM users u
      LEFT JOIN study s
        ON s.student_id = u.id
      LEFT JOIN evaluation_form ef
        ON ef.study_id = s.id
       AND ef.teacher_id = $1
       AND ef.score IS NOT NULL
      WHERE u.role = 'estudiante'
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY u.last_name, u.first_name
      `,
      [teacherId]
    );
    res.json({
      students: rows.map((r) => ({
        id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        studies: Number(r.studies),
        average_score: r.average_score !== null ? Number(r.average_score) : 0,
        last_activity: r.last_activity || "",
      })),
    });
  } catch (error) {
    console.error("Error fetching teacher students:", error);
    res.status(500).json({ msg: "Error fetching students" });
  }
};