import { Request, Response, NextFunction } from "express"
import bcrypt from "bcrypt"
import { pool } from "../../config/db"
import logger from "../../config/logger"

type Params = { id: string }
type Body = { current_password: string; new_password: string }

export const changePassword = async (
  req: Request<Params, never, Body>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params
  const { current_password, new_password } = req.body

  if (!current_password || !new_password) {
    res.status(400).json({ msg: "Debe proporcionar ambas contraseñas." })
    return
  }
  if (
    !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/.test(
      new_password
    )
  ) {
    res.status(400).json({
      msg: "La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.",
    })
    return
  }

  try {
    const { rows } = await pool.query<{ password: string }>(
      "SELECT password FROM users WHERE id = $1",
      [id]
    )
    if (rows.length === 0) {
      res.status(404).json({ msg: "Usuario no encontrado." })
      return
    }

    const coincide = await bcrypt.compare(current_password, rows[0].password)
    if (!coincide) {
      res.status(401).json({ msg: "La contraseña actual es incorrecta." })
      return
    }

    const hashNuevo = await bcrypt.hash(new_password, 10)
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashNuevo,
      id,
    ])

    res.json({ msg: "Contraseña actualizada exitosamente." })
  } catch (err) {
    logger.error("Error al cambiar contraseña", { err })
    next(err)
  }
}