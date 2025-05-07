import { Request, Response } from 'express';
import { pool } from '../../config/db';

export const createNewStudy = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const { title, description } = req.body;

  if (!title || !description) {
    res.status(400).json({ msg: 'Debe proporcionar titulo, descripción y fecha' });
    return;
  }  

  try {
    const status = 'pendiente';

    const result = await pool.query(
      `INSERT INTO study
         (student_id, title, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, student_id, title, description, status, created_at`,
      [userId, title, description, status]
    );

    const newStudy = result.rows[0];
    res.status(201).json({ study: newStudy });
  } catch (error) {
    console.error('Error al crear nuevo estudio:', error);
    res.status(500).json({ msg: 'Error al crear el estudio' });
  }
};
