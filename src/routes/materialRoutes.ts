import { Router } from "express";
import { upload, createMaterial }   from "../controllers/materialController/createMaterial";
import { getStudentMaterials }      from "../controllers/materialController/getStudentMaterials";
import { getMaterialStats }         from "../controllers/materialController/getMaterialStats";
import { getMaterialAssignments }   from "../controllers/materialController/getMaterialAssignments";
import { downloadMaterial }         from "../controllers/materialController/downloadMaterial";

import { authenticateToken } from "../middleware/authenticateToken";

const router = Router();

router.get("/summary",      getMaterialStats);
router.get("/student/:id",  getStudentMaterials);
router.post("/",            authenticateToken, upload.single("file"), createMaterial);
router.get("/:id/assignments", getMaterialAssignments);
router.get("/download/:id", downloadMaterial);


router.get("/download/:id", downloadMaterial);

export default router;