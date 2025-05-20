import { Router } from "express";
import { getStudentMaterials } from "../controllers/materialController/getStudentMaterials";
import { createMaterial }       from "../controllers/materialController/createMaterial";
import { getMaterialAssignments } from "../controllers/materialController/getMaterialAssignments";
import { authenticateToken }    from "../middleware/authenticateToken";

const router = Router();

router.get("/:id", getStudentMaterials);

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