import { Router } from "express";
import { createEvaluation, listEvaluationsByStudent } from "../controllers/evaluationController";
import { authenticateToken } from "../middleware/authenticateToken";

const router = Router();

router.post(
  "/:studyId",
  (req, res, next) => { authenticateToken(req, res, next); },
  createEvaluation
);

router.get(
  "/",
  (req, res, next) => { authenticateToken(req, res, next); },
  listEvaluationsByStudent
);

export default router;