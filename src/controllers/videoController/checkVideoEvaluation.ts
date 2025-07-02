import { Request, Response } from "express";
import { pool } from "../../config/db";

export const checkVideoEvaluation = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clipId = Number(req.params.clipId);
  
  if (isNaN(clipId)) {
    res.status(400).json({ msg: "ID de clip inválido" });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT 
        vc.id AS clip_id,
        vc.study_id,
        ef.id AS evaluation_id,
        ef.score,
        ef.feedback_summary,
        ef.submitted_at,
        CONCAT(u.first_name, ' ', u.last_name) AS teacher_name,
        CASE 
          WHEN ef.id IS NOT NULL THEN true 
          ELSE false 
        END AS has_evaluation
       FROM video_clip vc
       LEFT JOIN evaluation_form ef ON ef.study_id = vc.study_id
       LEFT JOIN users u ON u.id = ef.teacher_id
       WHERE vc.id = $1`,
      [clipId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ msg: "Video no encontrado" });
      return;
    }

    const videoData = result.rows[0];
    
    res.json({
      clipId: videoData.clip_id,
      studyId: videoData.study_id,
      hasEvaluation: videoData.has_evaluation,
      evaluation: videoData.has_evaluation ? {
        id: videoData.evaluation_id,
        score: videoData.score,
        feedbackSummary: videoData.feedback_summary,
        submittedAt: videoData.submitted_at,
        teacherName: videoData.teacher_name
      } : null
    });
  } catch (error) {
    console.error("Error al verificar evaluación del video:", error);
    res.status(500).json({ msg: "Error al verificar evaluación del video" });
  }
};

export const getVideoWithEvaluationDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clipId = Number(req.params.clipId);
  
  if (isNaN(clipId)) {
    res.status(400).json({ msg: "ID de clip inválido" });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT 
        vc.id AS clip_id,
        vc.study_id,
        vc.object_key,
        vc.original_filename,
        vc.mime_type,
        vc.size_bytes,
        vc.duration_seconds,
        vc.upload_date,
        vc.order_index,
        vc.protocol,
        vc.status,
        
        s.title AS study_title,
        s.description AS study_description,
        s.status AS study_status,
        
        CONCAT(us.first_name, ' ', us.last_name) AS student_name,
        us.email AS student_email,
        
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', t.id,
              'name', t.name,
              'condition_id', t.condition_id
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags,
        
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', cc.id,
              'comment_text', cc.comment_text,
              'timestamp', cc.timestamp,
              'author_name', CONCAT(uc.first_name, ' ', uc.last_name),
              'author_role', uc.role
            )
          ) FILTER (WHERE cc.id IS NOT NULL),
          '[]'
        ) AS comments,
        
        ef.id AS evaluation_id,
        ef.score,
        ef.feedback_summary,
        ef.submitted_at AS evaluation_submitted_at,
        CONCAT(ut.first_name, ' ', ut.last_name) AS teacher_name,
        ut.email AS teacher_email,
        
        ci_student.student_comment,
        ci_student.student_ready,
        ci_student.created_at AS student_interaction_date,
        
        ci_professor.professor_comment,
        ci_professor.created_at AS professor_interaction_date,
        
        iq.name AS image_quality_name,
        fd.name AS final_diagnosis_name,
        
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ea.id,
              'submitted_at', ea.submitted_at,
              'comment', ea.comment,
              'total_score', ea.total_score,
              'teacher_name', ea.teacher_name
            )
          ) FILTER (WHERE ea.id IS NOT NULL),
          '[]'
        ) AS evaluation_attempts
        
       FROM video_clip vc
       JOIN study s ON s.id = vc.study_id
       JOIN users us ON us.id = s.student_id
       
       LEFT JOIN clip_tag ct ON ct.clip_id = vc.id
       LEFT JOIN tag t ON t.id = ct.tag_id
       
       LEFT JOIN clip_comment cc ON cc.clip_id = vc.id
       LEFT JOIN users uc ON uc.id = cc.user_id
       
       LEFT JOIN evaluation_form ef ON ef.study_id = vc.study_id
       LEFT JOIN users ut ON ut.id = ef.teacher_id
       
       LEFT JOIN clip_interaction ci_student ON ci_student.clip_id = vc.id AND ci_student.role = 'estudiante'
       
       LEFT JOIN clip_interaction ci_professor ON ci_professor.clip_id = vc.id AND ci_professor.role = 'profesor'
       
       LEFT JOIN image_quality iq ON iq.id = ci_professor.image_quality_id
       LEFT JOIN final_diagnosis fd ON fd.id = ci_professor.final_diagnosis_id
       
       LEFT JOIN (
         SELECT 
           ea.id,
           ea.clip_id,
           ea.submitted_at,
           ea.comment,
           COALESCE(SUM(er.score), 0) AS total_score,
           CONCAT(u.first_name, ' ', u.last_name) AS teacher_name
         FROM evaluation_attempt ea
         LEFT JOIN evaluation_response er ON er.attempt_id = ea.id
         JOIN users u ON u.id = ea.teacher_id
         GROUP BY ea.id, ea.clip_id, ea.submitted_at, ea.comment, u.first_name, u.last_name
       ) ea ON ea.clip_id = vc.id
       
       WHERE vc.id = $1
       GROUP BY 
         vc.id, vc.study_id, vc.object_key, vc.original_filename, vc.mime_type,
         vc.size_bytes, vc.duration_seconds, vc.upload_date, vc.order_index,
         vc.protocol, vc.status, s.title, s.description, s.status,
         us.first_name, us.last_name, us.email, ef.id, ef.score, ef.feedback_summary,
         ef.submitted_at, ut.first_name, ut.last_name, ut.email,
         ci_student.student_comment, ci_student.student_ready, ci_student.created_at,
         ci_professor.professor_comment, ci_professor.created_at,
         iq.name, fd.name`,
      [clipId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ msg: "Video no encontrado" });
      return;
    }

    const videoData = result.rows[0];
    
    const response = {
      video: {
        id: videoData.clip_id,
        studyId: videoData.study_id,
        objectKey: videoData.object_key,
        originalFilename: videoData.original_filename,
        mimeType: videoData.mime_type,
        sizeBytes: videoData.size_bytes,
        durationSeconds: videoData.duration_seconds,
        uploadDate: videoData.upload_date,
        orderIndex: videoData.order_index,
        protocol: videoData.protocol,
        status: videoData.status
      },
      study: {
        id: videoData.study_id,
        title: videoData.study_title,
        description: videoData.study_description,
        status: videoData.study_status
      },
      student: {
        name: videoData.student_name,
        email: videoData.student_email
      },
      tags: videoData.tags,
      comments: videoData.comments,
      evaluation: videoData.evaluation_id ? {
        id: videoData.evaluation_id,
        score: videoData.score,
        feedbackSummary: videoData.feedback_summary,
        submittedAt: videoData.evaluation_submitted_at,
        teacher: {
          name: videoData.teacher_name,
          email: videoData.teacher_email
        }
      } : null,
      studentInteraction: videoData.student_comment ? {
        comment: videoData.student_comment,
        ready: videoData.student_ready,
        date: videoData.student_interaction_date
      } : null,
      professorInteraction: videoData.professor_comment ? {
        comment: videoData.professor_comment,
        date: videoData.professor_interaction_date,
        imageQuality: videoData.image_quality_name,
        finalDiagnosis: videoData.final_diagnosis_name
      } : null,
      evaluationAttempts: videoData.evaluation_attempts
    };

    res.json(response);
  } catch (error) {
    console.error("Error al obtener detalles del video con evaluación:", error);
    res.status(500).json({ msg: "Error al obtener detalles del video" });
  }
}; 