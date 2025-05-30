import { Router } from "express";
import { authenticateToken } from "../middleware/authenticateToken";
import { createAttempt } from "../controllers/evalAttemptController/createAttempt";
import { listAttempts  } from "../controllers/evalAttemptController/listAttempts";

const router = Router();


router.post(
  "/clips/:clipId/attempts",
  authenticateToken,
  createAttempt
);


router.get(
  "/clips/:clipId/attempts",
  authenticateToken,
  listAttempts
);

export default router;
