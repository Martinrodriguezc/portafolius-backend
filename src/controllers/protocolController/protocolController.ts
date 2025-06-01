import { RequestHandler } from 'express'
import { pool } from '../../config/db'

function makeKeyFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '')
}

export const getAllProtocols: RequestHandler = async (req, res, next) => {
  try {
    const { rows } = await pool.query<{ id: number; key: string; name: string }>(
      'SELECT id, key, name FROM protocol ORDER BY name'
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
  const trimmed = name.trim()
  const key = makeKeyFromName(trimmed)
  try {
    const { rows } = await pool.query<{ id: number; key: string; name: string }>(
      'INSERT INTO protocol(key, name) VALUES($1, $2) RETURNING id, key, name',
      [key, trimmed]
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