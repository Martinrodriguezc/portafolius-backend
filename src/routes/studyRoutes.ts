import { Router } from "express";
import { getStudentStudies } from "../controllers/studyController/studyController";
import { getVideosByStudyId } from "../controllers/studyController/getVideo";
import { createNewStudy } from "../controllers/studyController/createNewStudy";
import { getAllStudiesWithEvaluationStatus } from "../controllers/studyController/getAllStudies";
import { getRecentComments }  from '../controllers/studyController/getRecentComments';

const router = Router();

router.get("/:userId", getStudentStudies);
router.get("/:studyId/videos", getVideosByStudyId);
router.post("/:userId/studies", createNewStudy);
router.get("/teacher/study-with-status", getAllStudiesWithEvaluationStatus);
router.get('/:userId/comments', getRecentComments);  

export default router;
