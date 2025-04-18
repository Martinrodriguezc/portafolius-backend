CREATE TABLE
  IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(15) NOT NULL CHECK (role IN ('profesor', 'estudiante', 'admin')),
    created_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE
  IF NOT EXISTS study (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users (id),
    title VARCHAR(255) NOT NULL,
    protocol TEXT,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE IF NOT EXISTS video_clip (
  id SERIAL PRIMARY KEY,
  study_id INTEGER NOT NULL REFERENCES study(id),
  object_key VARCHAR(512) NOT NULL,           -- ruta en S3
  original_filename VARCHAR(255),              -- nombre original
  mime_type VARCHAR(100),                      -- tipo MIME
  size_bytes BIGINT,                           -- tamaño en bytes
  duration_seconds INTEGER,
  upload_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  order_index INTEGER NOT NULL,
  deleted_by_teacher BOOLEAN DEFAULT FALSE
);
