import { Router } from "express";
import { getStudentStudies } from "../controllers/studyController/studyController";
import { getVideosByStudyId } from "../controllers/studyController/getVideo";
import { createNewStudy } from "../controllers/studyController/createNewStudy";

const router = Router();

router.get("/:userId", getStudentStudies);
router.get("/:studyId/videos", getVideosByStudyId);
router.post("/:userId/studies", createNewStudy);

export default router;
