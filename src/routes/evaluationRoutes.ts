import { Router } from "express";
import {
  createEvaluation,
  getEvaluations,
  updateEvaluation
} from "../controllers/evaluationController";
import {
  saveDiagnosis,
  getDiagnosedVideos
} from "../controllers/evaluationController/createEvaluation";
import { authenticateToken } from "../middleware/authenticateToken";
import { getEvaluationByStudy } from "../controllers/evaluationController/getEvaluationByStudy";

const router = Router();

router.get(
  "/",
  (req, res, next) => { authenticateToken(req, res, next); },
  getEvaluations
);

router.post(
  "/:studyId",
  (req, res, next) => { authenticateToken(req, res, next); },
  createEvaluation
);

router.get(
  "/diagnosis",
  (req, res, next) => { authenticateToken(req, res, next); },
  getDiagnosedVideos
);

router.post(
  "/diagnosis/:videoId",
  (req, res, next) => { authenticateToken(req, res, next); },
  saveDiagnosis
);

router.get(
  "/by-study/:studyId",
  (req, res, next) => { authenticateToken(req, res, next); },
  getEvaluationByStudy
);

export default router;

