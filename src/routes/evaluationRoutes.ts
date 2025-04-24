import { Router } from "express";
import {
  createEvaluation,
  saveDiagnosis,
  getDiagnosedVideos
} from "../controllers/evaluationController/createEvaluation";

import { authenticateToken } from "../middleware/authenticateToken";

const router = Router();

router.post(
  "/:studyId",
  (req, res, next) => { authenticateToken(req, res, next); },
  createEvaluation
);

router.post(
  "/diagnosis/:videoId",
  (req, res, next) => { authenticateToken(req, res, next); },
  saveDiagnosis
);

router.get(
  "/diagnosis",
  (req, res, next) => { authenticateToken(req, res, next); },
  getDiagnosedVideos
);

export default router;
