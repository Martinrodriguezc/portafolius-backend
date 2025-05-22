import { Router } from "express";
import { authenticateToken } from "../middleware/authenticateToken";
import { getStudentMaterials } from "../controllers/materialController/getStudentMaterials";
import { getMaterialStats } from "../controllers/materialController/getMaterialStats";
import { createMaterial } from "../controllers/materialController/createMaterial";
import { getMaterialAssignments } from "../controllers/materialController/getMaterialAssignments";

const router = Router();

router.get(
  "/summary",
  authenticateToken,
  getMaterialStats
);

router.get(
  "/:id",
  authenticateToken,
  getStudentMaterials
);

router.post(
  "/",
  authenticateToken,
  createMaterial
);

router.get(
  "/:id/assignments",
  authenticateToken,
  getMaterialAssignments
);

export default router;