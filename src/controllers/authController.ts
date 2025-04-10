import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../config/db";

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret";

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { firstName, lastName, email, role, password } = req.body;

  if (!firstName || !lastName || !email || !role || !password) {
    res.status(400).json({ msg: "Debe proporcionar todos los campos" });
    return;
  }

  if (role != 'Estudiante' && role != 'Profesor') {
    res.status(400).json({ msg: "Rol incorrecto" });
    return;
  }

  const userExists = await pool.query(
    "SELECT * FROM Users WHERE email=$1",
    [email]
  );

  if (userExists.rows[0]) {
    res.status(400).json({ msg: "El usuario ya existe" });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO Users (first_name, last_name, email, role, password) VALUES ($1, $2, $3, $4, $5)",
      [firstName, lastName, email, role, hashedPassword]
    );

    res.status(201).json({
      msg: "Usuario registrado correctamente",
      user: newUser.rows[0],
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al registrar el usuario" });
  }
};
