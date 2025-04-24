import { Request, Response } from 'express';
import { pool } from '../../config/db';

export const createNewStudy = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const { title, protocol } = req.body;

  if (!title || !protocol) {
    res.status(400).json({ msg: 'Debe proporcionar title y protocol' });
    return;
  }

  try {
    const status = 'pendiente';
    const createdAt = new Date();

    const result = await pool.query(
      `INSERT INTO study
         (student_id, title, protocol, status, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, student_id, title, protocol, status, created_at`,
      [userId, title, protocol, status, createdAt]
    );

    const newStudy = result.rows[0];
    res.status(201).json({ study: newStudy });
  } catch (error) {
    console.error('Error al crear nuevo estudio:', error);
    res.status(500).json({ msg: 'Error al crear el estudio' });
  }
};
