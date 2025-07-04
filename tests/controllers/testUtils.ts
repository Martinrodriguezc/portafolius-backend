import { pool } from '../../src/config/db';

interface TestUser {
  id: number;
  email: string;
  role: string;
}

export interface TestData {
  student: TestUser;
  teacher: TestUser;
  studyId: number;
  clipId: number;
  attemptId: number;
  protocolItemIds: number[];
}

export const createTestData = async (): Promise<TestData> => {
  const timestamp = Date.now();
  
  // 1. Crear usuario estudiante
  const studentResult = await pool.query(
    `INSERT INTO users (email, password, first_name, last_name, role)
     VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Student', 'estudiante')
     RETURNING id, email, role`,
    [`test-student-${timestamp}@example.com`]
  );
  const student = studentResult.rows[0];

  // 2. Crear usuario profesor
  const teacherResult = await pool.query(
    `INSERT INTO users (email, password, first_name, last_name, role)
     VALUES ($1, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Teacher', 'profesor')
     RETURNING id, email, role`,
    [`test-teacher-${timestamp}@example.com`]
  );
  const teacher = teacherResult.rows[0];

  // 3. Crear estudio
  const studyResult = await pool.query(
    `INSERT INTO study (student_id, title, description, status)
     VALUES ($1, $2, 'Test Description', 'active')
     RETURNING id`,
    [student.id, `Test Study - ${timestamp}`]
  );
  const studyId = studyResult.rows[0].id;

  // 4. Crear video_clip
  const clipResult = await pool.query(
    `INSERT INTO video_clip (study_id, object_key, original_filename, mime_type, size_bytes, order_index, protocol)
     VALUES ($1, $2, 'test.mp4', 'video/mp4', 1000, 1, 'test-protocol')
     RETURNING id`,
    [studyId, `test-key-${timestamp}`]
  );
  const clipId = clipResult.rows[0].id;

  // 5. Crear protocol y protocol_items para los tests
  const protocolResult = await pool.query(
    `INSERT INTO protocol (key, name)
     VALUES ($1, 'Test Protocol')
     RETURNING id`,
    [`test_protocol_${timestamp}`]
  );
  const protocolId = protocolResult.rows[0].id;

  const sectionResult = await pool.query(
    `INSERT INTO protocol_section (protocol_id, key, name, sort_order)
     VALUES ($1, 'test_section', 'Test Section', 1)
     RETURNING id`,
    [protocolId]
  );
  const sectionId = sectionResult.rows[0].id;

  // Crear múltiples protocol_items
  const protocolItemIds: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const itemResult = await pool.query(
      `INSERT INTO protocol_item (section_id, key, label, score_scale, max_score)
       VALUES ($1, $2, $3, '1-10', 10)
       RETURNING id`,
      [sectionId, `test_item_${i}`, `Test Item ${i}`]
    );
    protocolItemIds.push(itemResult.rows[0].id);
  }

  // 6. Crear evaluation_attempt
  const attemptResult = await pool.query(
    `INSERT INTO evaluation_attempt (clip_id, teacher_id)
     VALUES ($1, $2)
     RETURNING id`,
    [clipId, teacher.id]
  );
  const attemptId = attemptResult.rows[0].id;

  return {
    student,
    teacher,
    studyId,
    clipId,
    attemptId,
    protocolItemIds
  };
};

export const cleanTestData = async (testData: TestData): Promise<void> => {
  // Limpiar en orden correcto debido a las foreign keys
  await pool.query(`DELETE FROM evaluation_response WHERE attempt_id = $1`, [testData.attemptId]);
  await pool.query(`DELETE FROM evaluation_attempt WHERE id = $1`, [testData.attemptId]);
  await pool.query(`DELETE FROM video_diagnosis WHERE video_id = $1`, [testData.clipId]);
  await pool.query(`DELETE FROM video_clip WHERE id = $1`, [testData.clipId]);
  
  // Eliminar evaluation_forms antes de eliminar studies
  await pool.query(`DELETE FROM evaluation_form WHERE study_id = $1`, [testData.studyId]);
  
  await pool.query(`DELETE FROM study WHERE id = $1`, [testData.studyId]);
  await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, [testData.student.id, testData.teacher.id]);
  
  // Limpiar protocol data (si es necesario)
  if (testData.protocolItemIds.length > 0) {
    const protocolSectionResult = await pool.query(
      `SELECT DISTINCT ps.id, ps.protocol_id 
       FROM protocol_section ps 
       JOIN protocol_item pi ON ps.id = pi.section_id 
       WHERE pi.id = ANY($1)`,
      [testData.protocolItemIds]
    );
    
    if (protocolSectionResult.rows.length > 0) {
      const sectionId = protocolSectionResult.rows[0].id;
      const protocolId = protocolSectionResult.rows[0].protocol_id;
      
      await pool.query(`DELETE FROM protocol_item WHERE id = ANY($1)`, [testData.protocolItemIds]);
      await pool.query(`DELETE FROM protocol_section WHERE id = $1`, [sectionId]);
      await pool.query(`DELETE FROM protocol WHERE id = $1`, [protocolId]);
    }
  }
};

export const createTestEvaluationForm = async (studyId: number, teacherId: number, score: number = 8, feedback: string = 'Test feedback') => {
  const result = await pool.query(
    `INSERT INTO evaluation_form (study_id, teacher_id, score, feedback_summary)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [studyId, teacherId, score, feedback]
  );
  return result.rows[0].id;
};

export const cleanTestEvaluationForm = async (evaluationId: number) => {
  await pool.query(`DELETE FROM evaluation_form WHERE id = $1`, [evaluationId]);
}; 