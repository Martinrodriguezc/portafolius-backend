import { pool } from "../config/db";
import logger from "../config/logger";
import bcrypt from "bcrypt";

// Función helper para generar fechas aleatorias en los últimos N meses
const getRandomDateInPastMonths = (monthsAgo: number): string => {
  const now = new Date();
  const pastDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const randomTime = pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime());
  return new Date(randomTime).toISOString();
};

// Función helper para generar fechas específicas por mes
const getDateForMonth = (monthsAgo: number, day: number = 15): string => {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
  return date.toISOString();
};

export const seedUsers = async (): Promise<void> => {
  try {
    logger.info("Iniciando seed completo de usuarios y datos dummy con fechas históricas...");

    // Verificar si ya existe el admin principal
    const adminExists = await pool.query(
      "SELECT COUNT(*) FROM users WHERE email = $1",
      ["admin1@portafolius.cl"]
    );

    if (parseInt(adminExists.rows[0].count) > 0) {
      logger.info("El administrador principal ya existe, omitiendo seed completo");
      return;
    }

    // Hash de la contraseña por defecto (password123)
    const defaultPassword = await bcrypt.hash("password123", 10);

    // ====== CREAR USUARIOS CON FECHAS DISTRIBUIDAS ======
    const users = [
      // Administradores (creados hace 6 meses)
      {
        email: "admin1@portafolius.cl",
        password: defaultPassword,
        first_name: "Carlos",
        last_name: "Administrador",
        role: "admin",
        created_at: getDateForMonth(6)
      },
      {
        email: "admin2@portafolius.cl", 
        password: defaultPassword,
        first_name: "María",
        last_name: "Coordinadora",
        role: "admin",
        created_at: getDateForMonth(5)
      },
      {
        email: "admin3@portafolius.cl",
        password: defaultPassword,
        first_name: "Luis",
        last_name: "Supervisor",
        role: "admin",
        created_at: getDateForMonth(4)
      },
      // Profesores (distribuidos en los últimos 5 meses)
      {
        email: "profesor1@portafolius.cl",
        password: defaultPassword,
        first_name: "Dr. Roberto",
        last_name: "González",
        role: "profesor",
        created_at: getDateForMonth(5)
      },
      {
        email: "profesor2@portafolius.cl",
        password: defaultPassword,
        first_name: "Dra. Ana",
        last_name: "Martínez",
        role: "profesor",
        created_at: getDateForMonth(4)
      },
      {
        email: "profesor3@portafolius.cl",
        password: defaultPassword,
        first_name: "Dr. Miguel",
        last_name: "Rodríguez",
        role: "profesor",
        created_at: getDateForMonth(3)
      },
      {
        email: "profesor4@portafolius.cl",
        password: defaultPassword,
        first_name: "Dra. Carmen",
        last_name: "Silva",
        role: "profesor",
        created_at: getDateForMonth(3)
      },
      {
        email: "profesor5@portafolius.cl",
        password: defaultPassword,
        first_name: "Dr. Pedro",
        last_name: "Morales",
        role: "profesor",
        created_at: getDateForMonth(2)
      },
      // Estudiantes (distribuidos en los últimos 4 meses)
      {
        email: "estudiante1@portafolius.cl",
        password: defaultPassword,
        first_name: "José",
        last_name: "Rodríguez",
        role: "estudiante",
        created_at: getDateForMonth(4)
      },
      {
        email: "estudiante2@portafolius.cl",
        password: defaultPassword,
        first_name: "Sofía",
        last_name: "López",
        role: "estudiante",
        created_at: getDateForMonth(4)
      },
      {
        email: "estudiante3@portafolius.cl",
        password: defaultPassword,
        first_name: "Diego",
        last_name: "Fernández",
        role: "estudiante",
        created_at: getDateForMonth(3)
      },
      {
        email: "estudiante4@portafolius.cl",
        password: defaultPassword,
        first_name: "Valentina",
        last_name: "Torres",
        role: "estudiante",
        created_at: getDateForMonth(3)
      },
      {
        email: "estudiante5@portafolius.cl",
        password: defaultPassword,
        first_name: "Matías",
        last_name: "Vargas",
        role: "estudiante",
        created_at: getDateForMonth(2)
      },
      {
        email: "estudiante6@portafolius.cl",
        password: defaultPassword,
        first_name: "Camila",
        last_name: "Moreno",
        role: "estudiante",
        created_at: getDateForMonth(2)
      },
      {
        email: "estudiante7@portafolius.cl",
        password: defaultPassword,
        first_name: "Sebastián",
        last_name: "Peña",
        role: "estudiante",
        created_at: getDateForMonth(1)
      },
      {
        email: "estudiante8@portafolius.cl",
        password: defaultPassword,
        first_name: "Francisca",
        last_name: "Herrera",
        role: "estudiante",
        created_at: getDateForMonth(1)
      },
      {
        email: "estudiante9@portafolius.cl",
        password: defaultPassword,
        first_name: "Andrés",
        last_name: "Castro",
        role: "estudiante",
        created_at: getDateForMonth(0, 10)
      },
      {
        email: "estudiante10@portafolius.cl",
        password: defaultPassword,
        first_name: "Isabella",
        last_name: "Jiménez",
        role: "estudiante",
        created_at: getDateForMonth(0, 20)
      }
    ];

    // Insertar usuarios y obtener sus IDs
    const userIds = new Map();
    for (const user of users) {
      const result = await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [user.email, user.password, user.first_name, user.last_name, user.role, user.created_at]
      );
      userIds.set(user.email, result.rows[0].id);
      logger.info(`Usuario creado: ${user.email} (${user.role})`);
    }

    // ====== CREAR RELACIONES PROFESOR-ESTUDIANTE ======
    const teacherStudentRelations = [
      { teacher: "profesor1@portafolius.cl", students: ["estudiante1@portafolius.cl", "estudiante2@portafolius.cl", "estudiante3@portafolius.cl"] },
      { teacher: "profesor2@portafolius.cl", students: ["estudiante4@portafolius.cl", "estudiante5@portafolius.cl"] },
      { teacher: "profesor3@portafolius.cl", students: ["estudiante6@portafolius.cl", "estudiante7@portafolius.cl"] },
      { teacher: "profesor4@portafolius.cl", students: ["estudiante8@portafolius.cl", "estudiante9@portafolius.cl"] },
      { teacher: "profesor5@portafolius.cl", students: ["estudiante10@portafolius.cl", "estudiante1@portafolius.cl"] }
    ];

    for (const relation of teacherStudentRelations) {
      const teacherId = userIds.get(relation.teacher);
      for (const studentEmail of relation.students) {
        const studentId = userIds.get(studentEmail);
        await pool.query(
          `INSERT INTO teacher_student (teacher_id, student_id) VALUES ($1, $2)`,
          [teacherId, studentId]
        );
      }
    }
    logger.info("Relaciones profesor-estudiante creadas");

    // ====== CREAR ESTUDIOS CON FECHAS DISTRIBUIDAS ======
    const studies = [
      { student: "estudiante1@portafolius.cl", title: "Análisis Ecográfico Abdominal", description: "Estudio completo de ecografía abdominal con énfasis en hígado y vesícula", status: "completado", created_at: getDateForMonth(3) },
      { student: "estudiante1@portafolius.cl", title: "Evaluación Cardiaca", description: "Ecocardiograma transtorácico con doppler color", status: "en_proceso", created_at: getDateForMonth(1) },
      { student: "estudiante2@portafolius.cl", title: "Ecografía Obstétrica", description: "Control prenatal segundo trimestre", status: "completado", created_at: getDateForMonth(3) },
      { student: "estudiante2@portafolius.cl", title: "Doppler Vascular", description: "Estudio doppler de extremidades inferiores", status: "pendiente", created_at: getDateForMonth(0) },
      { student: "estudiante3@portafolius.cl", title: "Ecografía Tiroidea", description: "Evaluación morfológica y vascular de tiroides", status: "completado", created_at: getDateForMonth(2) },
      { student: "estudiante3@portafolius.cl", title: "Ecografía Renal", description: "Estudio completo del sistema urogenital", status: "en_proceso", created_at: getDateForMonth(1) },
      { student: "estudiante4@portafolius.cl", title: "Ecografía Mamaria", description: "Screening mamario bilateral", status: "completado", created_at: getDateForMonth(2) },
      { student: "estudiante5@portafolius.cl", title: "Ecografía Pediátrica", description: "Evaluación abdominal en paciente pediátrico", status: "en_proceso", created_at: getDateForMonth(1) },
      { student: "estudiante6@portafolius.cl", title: "Ecografía Ginecológica", description: "Evaluación pélvica transvaginal", status: "completado", created_at: getDateForMonth(1) },
      { student: "estudiante7@portafolius.cl", title: "Ecografía Musculoesquelética", description: "Evaluación de hombro y manguito rotador", status: "pendiente", created_at: getDateForMonth(0) },
      { student: "estudiante8@portafolius.cl", title: "Ecografía Carotídea", description: "Doppler de vasos del cuello", status: "completado", created_at: getDateForMonth(1) },
      { student: "estudiante9@portafolius.cl", title: "Ecografía Testicular", description: "Evaluación escrotal bilateral", status: "en_proceso", created_at: getDateForMonth(0) },
      { student: "estudiante10@portafolius.cl", title: "Ecografía Abdominal Completa", description: "Evaluación de todos los órganos abdominales", status: "completado", created_at: getDateForMonth(0) }
    ];

    const studyIds = [];
    for (const study of studies) {
      const studentId = userIds.get(study.student);
      const result = await pool.query(
        `INSERT INTO study (student_id, title, description, status, created_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [studentId, study.title, study.description, study.status, study.created_at]
      );
      studyIds.push(result.rows[0].id);
    }
    logger.info(`${studies.length} estudios creados`);

    // ====== CREAR VIDEOS DUMMY CON FECHAS DISTRIBUIDAS ======
    const videoClips = [
      // Estudiante 1 - Estudio 1
      { studyIndex: 0, protocol: "abdomen", filename: "higado_normal.mp4", duration: 45, order: 1, status: "evaluado", upload_date: getDateForMonth(3) },
      { studyIndex: 0, protocol: "abdomen", filename: "vesicula_biliar.mp4", duration: 38, order: 2, status: "evaluado", upload_date: getDateForMonth(3) },
      { studyIndex: 0, protocol: "abdomen", filename: "rinon_derecho.mp4", duration: 52, order: 3, status: "pendiente", upload_date: getDateForMonth(2) },
      
      // Estudiante 1 - Estudio 2
      { studyIndex: 1, protocol: "cardiaco", filename: "ventriculo_izquierdo.mp4", duration: 60, order: 1, status: "en_revision", upload_date: getDateForMonth(1) },
      { studyIndex: 1, protocol: "cardiaco", filename: "auricula_derecha.mp4", duration: 42, order: 2, status: "pendiente", upload_date: getDateForMonth(1) },
      
      // Estudiante 2 - Estudio 1
      { studyIndex: 2, protocol: "obstetrico", filename: "feto_28_semanas.mp4", duration: 90, order: 1, status: "evaluado", upload_date: getDateForMonth(3) },
      { studyIndex: 2, protocol: "obstetrico", filename: "placenta_anterior.mp4", duration: 35, order: 2, status: "evaluado", upload_date: getDateForMonth(2) },
      
      // Estudiante 3 - Estudio 1
      { studyIndex: 4, protocol: "tiroides", filename: "lobulo_tiroideo_derecho.mp4", duration: 28, order: 1, status: "evaluado", upload_date: getDateForMonth(2) },
      { studyIndex: 4, protocol: "tiroides", filename: "doppler_tiroides.mp4", duration: 33, order: 2, status: "pendiente", upload_date: getDateForMonth(2) },
      
      // Más videos para otros estudios
      { studyIndex: 6, protocol: "mama", filename: "cuadrante_superior_externo.mp4", duration: 40, order: 1, status: "evaluado", upload_date: getDateForMonth(2) },
      { studyIndex: 7, protocol: "pediatrico", filename: "higado_pediatrico.mp4", duration: 25, order: 1, status: "en_revision", upload_date: getDateForMonth(1) },
      { studyIndex: 8, protocol: "ginecologico", filename: "utero_transvaginal.mp4", duration: 55, order: 1, status: "evaluado", upload_date: getDateForMonth(1) },
      { studyIndex: 10, protocol: "vascular", filename: "carotida_comun.mp4", duration: 48, order: 1, status: "evaluado", upload_date: getDateForMonth(1) },
      { studyIndex: 12, protocol: "abdomen", filename: "bazo_normal.mp4", duration: 32, order: 1, status: "evaluado", upload_date: getDateForMonth(0) },
      
      // Videos adicionales para mejor distribución
      { studyIndex: 3, protocol: "vascular", filename: "doppler_extremidad.mp4", duration: 38, order: 1, status: "pendiente", upload_date: getDateForMonth(0) },
      { studyIndex: 5, protocol: "renal", filename: "rinon_izquierdo.mp4", duration: 45, order: 1, status: "en_revision", upload_date: getDateForMonth(1) },
      { studyIndex: 9, protocol: "musculo", filename: "hombro_rotador.mp4", duration: 52, order: 1, status: "pendiente", upload_date: getDateForMonth(0) },
      { studyIndex: 11, protocol: "testicular", filename: "escroto_bilateral.mp4", duration: 35, order: 1, status: "en_revision", upload_date: getDateForMonth(0) }
    ];

    const clipIds = [];
    for (const clip of videoClips) {
      const studyId = studyIds[clip.studyIndex];
      const result = await pool.query(
        `INSERT INTO video_clip (study_id, protocol, object_key, original_filename, mime_type, size_bytes, duration_seconds, order_index, status, upload_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          studyId,
          clip.protocol,
          `dummy-videos/${clip.filename}`,
          clip.filename,
          "video/mp4",
          Math.floor(Math.random() * 50000000) + 10000000, // Size entre 10-60MB
          clip.duration,
          clip.order,
          clip.status,
          clip.upload_date
        ]
      );
      clipIds.push(result.rows[0].id);
    }
    logger.info(`${videoClips.length} video clips creados`);

    // ====== CREAR COMENTARIOS EN CLIPS ======
    const comments = [
      { clipIndex: 0, userEmail: "profesor1@portafolius.cl", text: "Excelente visualización del parénquima hepático. Técnica correcta." },
      { clipIndex: 0, userEmail: "estudiante1@portafolius.cl", text: "Gracias profesor, me enfoqué en mostrar la ecogenicidad homogénea." },
      { clipIndex: 1, userEmail: "profesor1@portafolius.cl", text: "Falta mostrar mejor el fondo vesicular. Revisar técnica." },
      { clipIndex: 3, userEmail: "profesor1@portafolius.cl", text: "Buena captura del ventrículo izquierdo en sístole y diástole." },
      { clipIndex: 5, userEmail: "profesor2@portafolius.cl", text: "Medición fetal correcta para la edad gestacional." },
      { clipIndex: 7, userEmail: "profesor3@portafolius.cl", text: "Nódulo tiroideo bien delimitado. Considerar BIRADS." },
      { clipIndex: 9, userEmail: "profesor4@portafolius.cl", text: "Técnica mamaria adecuada. Buen barrido sistemático." },
      { clipIndex: 11, userEmail: "profesor2@portafolius.cl", text: "Excelente demostración del útero y anexos." },
      { clipIndex: 12, userEmail: "profesor5@portafolius.cl", text: "Buen estudio vascular del cuello." },
      { clipIndex: 13, userEmail: "profesor1@portafolius.cl", text: "Imagen esplénica normal. Buen contraste." }
    ];

    for (const comment of comments) {
      const clipId = clipIds[comment.clipIndex];
      const userId = userIds.get(comment.userEmail);
      await pool.query(
        `INSERT INTO clip_comment (clip_id, user_id, comment_text)
         VALUES ($1, $2, $3)`,
        [clipId, userId, comment.text]
      );
    }
    logger.info(`${comments.length} comentarios creados`);

    // ====== CREAR MATERIALES EDUCATIVOS CON MAYOR VARIEDAD ======
    const materials = [
      {
        createdBy: "profesor1@portafolius.cl",
        type: "document",
        title: "Protocolo de Ecografía Abdominal",
        description: "Guía completa para la realización de ecografías abdominales",
        url: "documents/protocolo_abdomen.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048576,
        uploaded_at: getDateForMonth(4)
      },
      {
        createdBy: "profesor1@portafolius.cl",
        type: "video",
        title: "Técnicas de Doppler Color",
        description: "Video tutorial sobre el uso correcto del doppler color",
        url: "videos/doppler_tutorial.mp4",
        mimeType: "video/mp4",
        sizeBytes: 157286400,
        uploaded_at: getDateForMonth(3)
      },
      {
        createdBy: "profesor2@portafolius.cl",
        type: "document",
        title: "Atlas de Ecografía Obstétrica",
        description: "Compendio de imágenes normales y patológicas en obstetricia",
        url: "documents/atlas_obstetrico.pdf",
        mimeType: "application/pdf",
        sizeBytes: 5242880,
        uploaded_at: getDateForMonth(3)
      },
      {
        createdBy: "profesor3@portafolius.cl",
        type: "link",
        title: "Calculadora de Edad Gestacional",
        description: "Herramienta online para cálculos obstétricos",
        url: "https://calculadora-eg.example.com",
        mimeType: null,
        sizeBytes: null,
        uploaded_at: getDateForMonth(2)
      },
      {
        createdBy: "profesor4@portafolius.cl",
        type: "document",
        title: "BIRADS en Ecografía Mamaria",
        description: "Clasificación y criterios BIRADS para mama",
        url: "documents/birads_mama.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1048576,
        uploaded_at: getDateForMonth(2)
      },
      {
        createdBy: "profesor5@portafolius.cl",
        type: "video",
        title: "Ecocardiografía Básica",
        description: "Fundamentos de la evaluación cardiaca por ultrasonido",
        url: "videos/ecocardiografia_basica.mp4",
        mimeType: "video/mp4",
        sizeBytes: 234567890,
        uploaded_at: getDateForMonth(1)
      },
      {
        createdBy: "profesor2@portafolius.cl",
        type: "link",
        title: "Base de Datos de Casos Clínicos",
        description: "Repositorio online de casos de ultrasonido",
        url: "https://casos-clinicos.example.com",
        mimeType: null,
        sizeBytes: null,
        uploaded_at: getDateForMonth(1)
      },
      {
        createdBy: "profesor3@portafolius.cl",
        type: "document",
        title: "Manual de Ecografía Tiroidea",
        description: "Guía práctica para evaluación de patología tiroidea",
        url: "documents/manual_tiroides.pdf",
        mimeType: "application/pdf",
        sizeBytes: 3145728,
        uploaded_at: getDateForMonth(0)
      },
      {
        createdBy: "profesor1@portafolius.cl",
        type: "video",
        title: "Ecografía Pediátrica Avanzada",
        description: "Técnicas especializadas en ultrasonido pediátrico",
        url: "videos/pediatrica_avanzada.mp4",
        mimeType: "video/mp4",
        sizeBytes: 198765432,
        uploaded_at: getDateForMonth(0)
      }
    ];

    const materialIds = [];
    for (const material of materials) {
      const createdById = userIds.get(material.createdBy);
      const result = await pool.query(
        `INSERT INTO material (created_by, type, title, description, url, mime_type, size_bytes, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [createdById, material.type, material.title, material.description, material.url, material.mimeType, material.sizeBytes, material.uploaded_at]
      );
      materialIds.push(result.rows[0].id);
    }
    logger.info(`${materials.length} materiales creados`);

    // ====== ASIGNAR MATERIALES A ESTUDIANTES ======
    const materialAssignments = [
      { materialIndex: 0, students: ["estudiante1@portafolius.cl", "estudiante2@portafolius.cl", "estudiante3@portafolius.cl"], assignedBy: "profesor1@portafolius.cl" },
      { materialIndex: 1, students: ["estudiante1@portafolius.cl", "estudiante4@portafolius.cl"], assignedBy: "profesor1@portafolius.cl" },
      { materialIndex: 2, students: ["estudiante2@portafolius.cl", "estudiante6@portafolius.cl"], assignedBy: "profesor2@portafolius.cl" },
      { materialIndex: 3, students: ["estudiante2@portafolius.cl"], assignedBy: "profesor3@portafolius.cl" },
      { materialIndex: 4, students: ["estudiante4@portafolius.cl", "estudiante8@portafolius.cl"], assignedBy: "profesor4@portafolius.cl" },
      { materialIndex: 5, students: ["estudiante1@portafolius.cl", "estudiante5@portafolius.cl"], assignedBy: "profesor5@portafolius.cl" },
      { materialIndex: 6, students: ["estudiante3@portafolius.cl", "estudiante7@portafolius.cl"], assignedBy: "profesor2@portafolius.cl" },
      { materialIndex: 7, students: ["estudiante6@portafolius.cl", "estudiante9@portafolius.cl"], assignedBy: "profesor3@portafolius.cl" },
      { materialIndex: 8, students: ["estudiante5@portafolius.cl", "estudiante10@portafolius.cl"], assignedBy: "profesor1@portafolius.cl" }
    ];

    for (const assignment of materialAssignments) {
      const materialId = materialIds[assignment.materialIndex];
      const assignedByUserId = userIds.get(assignment.assignedBy);
      
      for (const studentEmail of assignment.students) {
        const studentId = userIds.get(studentEmail);
        await pool.query(
          `INSERT INTO material_assignment (material_id, student_id, assigned_by)
           VALUES ($1, $2, $3)`,
          [materialId, studentId, assignedByUserId]
        );
      }
    }
    logger.info("Asignaciones de materiales creadas");

    // ====== CREAR EVALUACIONES CON DISTRIBUCIÓN ESTRATÉGICA ======
    const evaluations = [
      // Profesor1 - 4 evaluaciones (será el top)
      { studyIndex: 0, teacherEmail: "profesor1@portafolius.cl", score: 8.5, feedback: "Buen trabajo en la técnica básica. Mejorar la documentación de hallazgos.", submitted_at: getDateForMonth(3) },
      { studyIndex: 4, teacherEmail: "profesor1@portafolius.cl", score: 7.2, feedback: "Técnica correcta pero falta profundizar en el análisis doppler.", submitted_at: getDateForMonth(2) },
      { studyIndex: 12, teacherEmail: "profesor1@portafolius.cl", score: 9.1, feedback: "Estudio completo y bien documentado. Excelente trabajo.", submitted_at: getDateForMonth(0) },
      { studyIndex: 1, teacherEmail: "profesor1@portafolius.cl", score: 6.8, feedback: "Necesita mejorar la técnica de captura cardiaca.", submitted_at: getDateForMonth(1) },
      
      // Profesor2 - 3 evaluaciones
      { studyIndex: 2, teacherEmail: "profesor2@portafolius.cl", score: 9.2, feedback: "Excelente manejo del transductor. Mediciones precisas.", submitted_at: getDateForMonth(2) },
      { studyIndex: 8, teacherEmail: "profesor2@portafolius.cl", score: 8.3, feedback: "Adecuada visualización de estructuras pélvicas.", submitted_at: getDateForMonth(1) },
      { studyIndex: 5, teacherEmail: "profesor2@portafolius.cl", score: 7.9, feedback: "Buen estudio renal. Considerar cortes adicionales.", submitted_at: getDateForMonth(1) },
      
      // Profesor3 - 2 evaluaciones
      { studyIndex: 6, teacherEmail: "profesor3@portafolius.cl", score: 9.0, feedback: "Muy buena sistemática de exploración mamaria. Felicitaciones.", submitted_at: getDateForMonth(2) },
      { studyIndex: 7, teacherEmail: "profesor3@portafolius.cl", score: 8.7, feedback: "Excelente técnica pediátrica. Paciente colaborador.", submitted_at: getDateForMonth(1) },
      
      // Profesor4 - 2 evaluaciones
      { studyIndex: 10, teacherEmail: "profesor4@portafolius.cl", score: 8.1, feedback: "Buen estudio vascular. Considerar optimizar ganancia doppler.", submitted_at: getDateForMonth(1) },
      { studyIndex: 11, teacherEmail: "profesor4@portafolius.cl", score: 7.5, feedback: "Evaluación testicular adecuada. Mejorar documentación.", submitted_at: getDateForMonth(0) },
      
      // Profesor5 - 1 evaluación
      { studyIndex: 9, teacherEmail: "profesor5@portafolius.cl", score: 6.2, feedback: "Estudio musculoesquelético básico. Necesita práctica adicional.", submitted_at: getDateForMonth(0) }
    ];

    for (const evaluation of evaluations) {
      const studyId = studyIds[evaluation.studyIndex];
      const teacherId = userIds.get(evaluation.teacherEmail);
      await pool.query(
        `INSERT INTO evaluation_form (study_id, teacher_id, score, feedback_summary, submitted_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [studyId, teacherId, evaluation.score, evaluation.feedback, evaluation.submitted_at]
      );
    }
    logger.info(`${evaluations.length} evaluaciones creadas`);

    // ====== LOGS FINALES ======
    logger.info("=== SEED COMPLETO FINALIZADO ===");
    logger.info("Datos creados con distribución temporal para métricas:");
    logger.info(`- ${users.length} usuarios (3 admin, 5 profesores, 10 estudiantes) - distribuidos en 6 meses`);
    logger.info(`- ${studies.length} estudios - distribuidos en 4 meses`);
    logger.info(`- ${videoClips.length} video clips - distribuidos en 4 meses`);
    logger.info(`- ${comments.length} comentarios`);
    logger.info(`- ${materials.length} materiales educativos (${materials.filter(m => m.type === 'document').length} documentos, ${materials.filter(m => m.type === 'video').length} videos, ${materials.filter(m => m.type === 'link').length} links)`);
    logger.info(`- ${evaluations.length} evaluaciones - distribuidas por profesor:`);
    logger.info("  * Profesor1: 4 evaluaciones (promedio 7.9)");
    logger.info("  * Profesor2: 3 evaluaciones (promedio 8.5)");
    logger.info("  * Profesor3: 2 evaluaciones (promedio 8.8)");
    logger.info("  * Profesor4: 2 evaluaciones (promedio 7.8)");
    logger.info("  * Profesor5: 1 evaluación (promedio 6.2)");
    logger.info("- Relaciones profesor-estudiante establecidas");
    logger.info("- Asignaciones de materiales realizadas");
    logger.info("- Datos optimizados para mostrar métricas del admin dashboard");
    logger.info("");
    logger.info("=== CREDENCIALES DE ACCESO ===");
    logger.info("Contraseña para todos los usuarios: password123");
    logger.info("");
    logger.info("Administradores:");
    logger.info("- admin1@portafolius.cl");
    logger.info("- admin2@portafolius.cl"); 
    logger.info("- admin3@portafolius.cl");
    logger.info("");
    logger.info("Profesores:");
    logger.info("- profesor1@portafolius.cl a profesor5@portafolius.cl");
    logger.info("");
    logger.info("Estudiantes:");
    logger.info("- estudiante1@portafolius.cl a estudiante10@portafolius.cl");
    
  } catch (error) {
    logger.error("Error al ejecutar el seed completo", { error });
    throw error;
  }
}; 