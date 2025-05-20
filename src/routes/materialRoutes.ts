import { Router } from "express";
import { getStudentMaterials } from "../controllers/materialController/getStudentMaterials";
import { createMaterial } from "../controllers/materialController/createMaterial";
import { getMaterialAssignments } from "../controllers/materialController/getMaterialAssignments";

const router = Router();

// Recuperar materiales para un estudiante (público)
router.get("/:id", getStudentMaterials);

// Crear material y asignar (sólo profesores)
router.post("/", createMaterial);

// Consultar asignaciones de un material (sólo profesores)
router.get("/:id/assignments", getMaterialAssignments);

export default router;