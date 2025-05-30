import { Router } from "express";
import { authenticateToken } from "../middleware/authenticateToken";
import { createResponse } from "../controllers/evalResponseController/createResponse";
import { listResponses } from "../controllers/evalResponseController/listResponses";

const router = Router();

router.post(
  "/attempts/:attemptId/responses",
  authenticateToken,
  createResponse
);

router.get(
  "/attempts/:attemptId/responses",
  authenticateToken,
  listResponses
);

export default router;
