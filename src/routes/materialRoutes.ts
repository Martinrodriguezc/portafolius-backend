import { Router } from "express";
import { getStudentMaterials } from "../controllers/materialController/getStudentMaterials";
import { createMaterial } from "../controllers/materialController/createMaterial";
import { getMaterialAssignments } from "../controllers/materialController/getMaterialAssignments";

const router = Router();

router.get("/:id", getStudentMaterials);

router.post("/", createMaterial);
router.get("/:id/assignments", getMaterialAssignments);

export default router;