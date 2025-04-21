import { Router } from "express";
import { createEvaluation } from "../controllers/evaluationController";
import { authenticateToken } from "../middleware/authenticateToken";

const router = Router();

router.post(
    "/:studyId",
    (req, res, next) => { authenticateToken(req, res, next); },
    createEvaluation
  );

export default router;

