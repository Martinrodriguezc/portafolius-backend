import { pool } from "../config/db";
import logger from "../config/logger";

export const initializeDatabase = async (): Promise<void> => {
  try {
    // Crear tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(15) NOT NULL CHECK (role IN ('profesor', 'estudiante', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla de estudios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS study (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        protocol TEXT,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla de video_clip
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_clip (
        id SERIAL PRIMARY KEY,
        study_id INTEGER NOT NULL REFERENCES study(id),
        file_path VARCHAR(255) NOT NULL,
        duration_seconds INTEGER,
        upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        order_index INTEGER NOT NULL,
        deleted_by_teacher BOOLEAN DEFAULT FALSE
      );
    `);

    // Crear tabla de mensajes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS message (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id),
        receiver_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla de etiquetas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tag (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_by INTEGER REFERENCES users(id)
      );
    `);

    // Crear tabla de formularios de evaluación
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evaluation_form (
        id SERIAL PRIMARY KEY,
        study_id INTEGER NOT NULL REFERENCES study(id),
        teacher_id INTEGER NOT NULL REFERENCES users(id),
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        score FLOAT,
        feedback_summary TEXT
      );
    `);

    // Crear tabla de métricas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS metric (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        tag_id INTEGER NOT NULL REFERENCES tag(id),
        count INTEGER DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla de comentarios de clips
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clip_comment (
        id SERIAL PRIMARY KEY,
        clip_id INTEGER NOT NULL REFERENCES video_clip(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        comment_text TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla de relación entre clips y etiquetas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clip_tag (
        clip_id INTEGER NOT NULL REFERENCES video_clip(id),
        tag_id INTEGER NOT NULL REFERENCES tag(id),
        assigned_by INTEGER NOT NULL REFERENCES users(id),
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (clip_id, tag_id)
      );
    `);

    logger.info("Base de datos inicializada correctamente");
  } catch (error) {
    logger.error("Error al inicializar la base de datos", { error });
    throw error;
  }
}; 