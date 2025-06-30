import { pool } from "../config/db";
import logger from "../config/logger";
import bcrypt from "bcrypt";

export const seedUsers = async (): Promise<void> => {
  try {
    logger.info("Iniciando seed de usuarios...");

    // Verificar si ya existen usuarios para evitar duplicados
    const existingUsersResult = await pool.query("SELECT COUNT(*) FROM users");
    const userCount = parseInt(existingUsersResult.rows[0].count);

    if (userCount > 500) {
      logger.info("Los usuarios ya existen, omitiendo seed de usuarios");
      return;
    }

    // Hash de la contraseña por defecto (password123)
    const defaultPassword = await bcrypt.hash("password123", 10);

    const users = [
      // Administradores
      {
        email: "admin1@portafolius.cl",
        password: defaultPassword,
        first_name: "Carlos",
        last_name: "Administrador",
        role: "admin"
      },
      {
        email: "admin2@portafolius.cl", 
        password: defaultPassword,
        first_name: "María",
        last_name: "Coordinadora",
        role: "admin"
      },
      // Profesores
      {
        email: "profesor1@portafolius.cl",
        password: defaultPassword,
        first_name: "Dr. Roberto",
        last_name: "González",
        role: "profesor"
      },
      {
        email: "profesor2@portafolius.cl",
        password: defaultPassword,
        first_name: "Dra. Ana",
        last_name: "Martínez",
        role: "profesor"
      },
      // Estudiantes
      {
        email: "estudiante1@portafolius.cl",
        password: defaultPassword,
        first_name: "José",
        last_name: "Rodríguez",
        role: "estudiante"
      },
      {
        email: "estudiante2@portafolius.cl",
        password: defaultPassword,
        first_name: "Sofía",
        last_name: "López",
        role: "estudiante"
      }
    ];

    // Insertar usuarios uno por uno
    for (const user of users) {
      await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.email, user.password, user.first_name, user.last_name, user.role]
      );
      logger.info(`Usuario creado: ${user.email} (${user.role})`);
    }

    logger.info("Seed de usuarios completado exitosamente");
    logger.info("Credenciales por defecto para todos los usuarios:");
    logger.info("Contraseña: password123");
    
  } catch (error) {
    logger.error("Error al ejecutar el seed de usuarios", { error });
    throw error;
  }
}; 