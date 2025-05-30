import { RequestHandler } from 'express'
import { pool } from '../../config/db'

export const getAllProtocols: RequestHandler = async (req, res, next) => {
  try {
    const { rows } = await pool.query<{ id: number; name: string }>(
      'SELECT id, name FROM protocol ORDER BY name'
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export const createProtocol: RequestHandler = async (req, res, next) => {
  const { name } = req.body
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'El nombre del protocolo es requerido' })
    return
  }
  try {
    const { rows } = await pool.query<{ id: number; name: string }>(
      'INSERT INTO protocol(name) VALUES($1) RETURNING id, name',
      [name.trim()]
    )
    res.status(201).json(rows[0])
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Protocolo ya existe' })
    } else {
      next(err)
    }
  }
}