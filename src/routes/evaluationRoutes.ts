import { Router } from "express";
import { createEvaluation, getEvaluations, updateEvaluation } from "../controllers/evaluationController";
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

router.put(
  "/:id",
  (req, res, next) => { authenticateToken(req, res, next); },
  updateEvaluation
);

router.get("/by-study/:studyId", getEvaluationByStudy);

export default router;


