import { Router } from "express";
import { createEvaluation, getEvaluations, updateEvaluation } from "../controllers/evaluationController";
import { authenticateToken } from "../middleware/authenticateToken";

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

export default router;


