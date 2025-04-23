import { Router } from "express";
import { getStudentMaterials } from "../controllers/materialController/materialController";

const router = Router();

router.get("/student/:id/", getStudentMaterials);

export default router;