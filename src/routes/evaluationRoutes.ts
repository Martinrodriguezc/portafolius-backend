import { Router } from "express";
import { authenticateToken } from "../middleware/authenticateToken";

// Evaluaciones por estudio (legacy)
import {
  createEvaluation,
  getEvaluations,
  updateEvaluation,
} from "../controllers/evaluationController";

// Diagnóstico por vídeo
import {
  saveDiagnosis,
  getDiagnosedVideos,
} from "../controllers/evaluationController/createEvaluation";

// Última evaluación por estudio
import { getEvaluationByStudy } from "../controllers/evaluationController/getEvaluationByStudy";

const router = Router();

// Todas estas rutas requieren token
router.use(authenticateToken);

// Listar todas las evaluaciones de quien inició sesión (profesor)
router.get("/", getEvaluations);

// Crear nueva evaluación sobre un estudio
router.post("/:studyId", createEvaluation);

// Actualizar evaluación existente
router.put("/:id", updateEvaluation);

// Listar vídeos que el alumno ya diagnosticó
router.get("/diagnosis", getDiagnosedVideos);

// Guardar un diagnóstico sobre un vídeo
router.post("/diagnosis/:videoId", saveDiagnosis);

// Traer la última evaluación de un estudio
router.get("/by-study/:studyId", getEvaluationByStudy);

export default router;


