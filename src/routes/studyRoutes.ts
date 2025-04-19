// src/routes/studyRoutes.ts
import { Router } from "express";
import { getStudentStudies } from "../controllers/studyController/studyController";
import { getVideosByStudyId } from "../controllers/studyController/getVideo";

const router = Router();

router.get("/:userId", getStudentStudies);
router.get("/:studyId/videos", getVideosByStudyId);

export default router;
