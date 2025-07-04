import { pool } from "../config/db";
import logger from "../config/logger";
import { seedTagHierarchy } from "../seeds/tagSeed";
import { seedProtocols }    from "../seeds/protocolSeed";
import { seedProtocolHierarchy } from "../seeds/protocolsConfigSeed";
import { seedUsers } from "../seeds/userSeed";

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
        role VARCHAR(15) NOT NULL CHECK (role IN ('google_login', 'profesor', 'estudiante', 'admin')),
        autorizado BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla de estudios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS study (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Tabla de órganos
    await pool.query(`
          CREATE TABLE IF NOT EXISTS organ (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL
          );
        `);

    // Tabla de estructuras (zonas del órgano)
    await pool.query(`
          CREATE TABLE IF NOT EXISTS structure (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            organ_id INTEGER NOT NULL REFERENCES organ(id),
            UNIQUE(name, organ_id)
          );
        `);

    // Tabla de condiciones médicas asociadas a estructuras
    await pool.query(`
          CREATE TABLE IF NOT EXISTS condition (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            structure_id INTEGER NOT NULL REFERENCES structure(id),
            UNIQUE(name, structure_id)
          );
        `);

    // Crear tabla de etiquetas
    await pool.query(`
          CREATE TABLE IF NOT EXISTS tag (
            id SERIAL PRIMARY KEY,
            name VARCHAR(250) UNIQUE NOT NULL,
            created_by INTEGER REFERENCES users(id),
            condition_id INTEGER REFERENCES condition(id)
          );
        `);

    // Crear tabla de video_clip
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_clip (
        id SERIAL PRIMARY KEY,
        study_id INTEGER NOT NULL REFERENCES study(id),
        protocol TEXT,
        object_key TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes BIGINT        NOT NULL,
        duration_seconds INTEGER,
        upload_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        order_index INTEGER NOT NULL,
        deleted_by_teacher BOOLEAN NOT NULL DEFAULT FALSE,
        status VARCHAR(50) NOT NULL DEFAULT 'pendiente',
        tag_id INTEGER REFERENCES tag(id)
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


    // Crear tabla de materiales
    await pool.query(`
      CREATE TABLE IF NOT EXISTS material (
        id           SERIAL PRIMARY KEY,
        student_id   INTEGER REFERENCES users(id),   -- NULL = material global
        type         VARCHAR(12) NOT NULL CHECK (type IN ('document','video','link')),
        title        VARCHAR(255) NOT NULL,
        description  TEXT,
        url          VARCHAR(600) NOT NULL,
        size_bytes   INTEGER,
        mime_type    VARCHAR(120),
        uploaded_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Registrar quién creó cada material (profesor)
    await pool.query(`
      ALTER TABLE material
      ADD COLUMN IF NOT EXISTS created_by INTEGER NOT NULL REFERENCES users(id);
    `);
    
    await pool.query(`
      ALTER TABLE material
      ADD COLUMN IF NOT EXISTS file_data BYTEA;
    `);

    // Índice básico para búsqueda por estudiante y tipo (mantener el tuyo)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_material_student
      ON material (student_id, type);
    `);

    // Tabla puente para asignar un material a N estudiantes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS material_assignment (
        material_id INTEGER NOT NULL REFERENCES material(id),
        student_id  INTEGER NOT NULL REFERENCES users(id),
        assigned_by INTEGER NOT NULL REFERENCES users(id),
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (material_id, student_id)
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_material_student
      ON material (student_id, type);
    `);

    // Crear tabla de relación entre profesores y alumnos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_student (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES users(id),
        student_id INTEGER NOT NULL REFERENCES users(id),
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(teacher_id, student_id)
      );
    `);
    

    // Después de crear material_assignment…
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_material_assignment_student
      ON material_assignment (student_id);
    `);

    // Creamos la tabla de protocolos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS protocol (
        id   SERIAL PRIMARY KEY,
        key  VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL
      );
    `);

    //  Secciones dentro de cada protocolo
    await pool.query(`
      CREATE TABLE IF NOT EXISTS protocol_section (
        id          SERIAL PRIMARY KEY,
        protocol_id INTEGER NOT NULL REFERENCES protocol(id),
        key         VARCHAR(50) NOT NULL,
        name        VARCHAR(100) NOT NULL,
        sort_order  INTEGER NOT NULL,
        UNIQUE(protocol_id, key)
      );
    `);

    // Ítems de evaluación en cada sección
    await pool.query(`
      CREATE TABLE IF NOT EXISTS protocol_item (
        id               SERIAL PRIMARY KEY,
        section_id       INTEGER NOT NULL REFERENCES protocol_section(id),
        key              VARCHAR(100) NOT NULL,
        label            VARCHAR(255) NOT NULL,
        score_scale      VARCHAR(20) NOT NULL, 
        max_score        INTEGER NOT NULL,
        UNIQUE(section_id, key)     
      );
    `);

    // Intentos de evaluación: uno por vídeo y profesor
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evaluation_attempt (
        id           SERIAL PRIMARY KEY,
        clip_id      INTEGER NOT NULL REFERENCES video_clip(id),
        teacher_id   INTEGER NOT NULL REFERENCES users(id),
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Respuestas de cada ítem en un intento
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evaluation_response (
        id               SERIAL PRIMARY KEY,
        attempt_id       INTEGER NOT NULL REFERENCES evaluation_attempt(id),
        protocol_item_id INTEGER NOT NULL REFERENCES protocol_item(id),
        score            INTEGER NOT NULL CHECK (score >= 0),
        UNIQUE(attempt_id, protocol_item_id)
      );
    `);

  await pool.query(`
      ALTER TABLE evaluation_attempt
      ADD COLUMN IF NOT EXISTS comment TEXT;
    `);

    // Tablas para protocolos dinámicos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS protocol_window (
        id          SERIAL PRIMARY KEY,
        protocol_id INTEGER NOT NULL REFERENCES protocol(id) ON DELETE CASCADE,
        key         VARCHAR(50) NOT NULL,
        name        VARCHAR(100) NOT NULL,
        UNIQUE(protocol_id, key)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS finding (
        id        SERIAL PRIMARY KEY,
        window_id INTEGER NOT NULL REFERENCES protocol_window(id) ON DELETE CASCADE,
        key       VARCHAR(50) NOT NULL,
        name      VARCHAR(100) NOT NULL,
        UNIQUE(window_id, key)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS possible_diagnosis (
        id         SERIAL PRIMARY KEY,
        finding_id INTEGER NOT NULL REFERENCES finding(id) ON DELETE CASCADE,
        key        VARCHAR(100) NOT NULL,
        name       VARCHAR(255) NOT NULL,
        UNIQUE(finding_id, key)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subdiagnosis (
        id                    SERIAL PRIMARY KEY,
        possible_diagnosis_id INTEGER NOT NULL REFERENCES possible_diagnosis(id) ON DELETE CASCADE,
        key                   VARCHAR(100) NOT NULL,
        name                  VARCHAR(255) NOT NULL,
        UNIQUE(possible_diagnosis_id, key)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sub_subdiagnosis (
        id               SERIAL PRIMARY KEY,
        subdiagnosis_id  INTEGER NOT NULL REFERENCES subdiagnosis(id) ON DELETE CASCADE,
        key              VARCHAR(100) NOT NULL,
        name             VARCHAR(255) NOT NULL,
        UNIQUE(subdiagnosis_id, key)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS third_order_diagnosis (
        id                   SERIAL PRIMARY KEY,
        sub_subdiagnosis_id  INTEGER NOT NULL REFERENCES sub_subdiagnosis(id) ON DELETE CASCADE,
        key                  VARCHAR(100) NOT NULL,
        name                 VARCHAR(255) NOT NULL,
        UNIQUE(sub_subdiagnosis_id, key)
      );
    `);

    // Tablas globales de opciones fijas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS image_quality (
        id   SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS final_diagnosis (
        id   SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    // Tabla de interacciones por clip (estudiante ↔ profesor)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clip_interaction (
      id                         SERIAL PRIMARY KEY,
      clip_id                    INTEGER NOT NULL REFERENCES video_clip(id) ON DELETE CASCADE,
      user_id                    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role                       VARCHAR(15) NOT NULL CHECK(role IN ('estudiante','profesor')),
      protocol_key               VARCHAR(50),
      window_id                  INTEGER,
      finding_id                 INTEGER,
      possible_diagnosis_id      INTEGER,
      subdiagnosis_id            INTEGER,
      sub_subdiagnosis_id        INTEGER,
      third_order_diagnosis_id   INTEGER,
      student_comment            TEXT,
      student_ready              BOOLEAN,
      image_quality_id           INTEGER REFERENCES image_quality(id),
      final_diagnosis_id         INTEGER REFERENCES final_diagnosis(id),
      professor_comment          TEXT,
      created_at                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // — clip_interaction: crea la constraint solo si no existe aún —
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
            FROM pg_constraint
           WHERE conname = 'uq_clip_interaction_clip_role'
        ) THEN
          ALTER TABLE clip_interaction
            ADD CONSTRAINT uq_clip_interaction_clip_role UNIQUE (clip_id, role);
        END IF;
      END
      $$;
    `);

    // — evaluation_form: idem —
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
            FROM pg_constraint
           WHERE conname = 'uq_evaluation_form_study'
        ) THEN
          ALTER TABLE evaluation_form
            ADD CONSTRAINT uq_evaluation_form_study UNIQUE (study_id);
        END IF;
      END
      $$;
    `);

    logger.info("Base de datos inicializada correctamente");
    try {
      await seedTagHierarchy();
      await seedProtocolHierarchy();
      await seedProtocols();
      await seedUsers();

      logger.info("Seeds ejecutados correctamente");
    } catch (seedError) {
      logger.error("Error al ejecutar los seeds", { error: seedError });
    }

  } catch (error) {
    logger.error("Error al inicializar la base de datos", { error });
    throw error;
  }
};