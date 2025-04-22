import { Router } from "express";
import {
  getTeacherStats,
  getTeacherVideos,
  getPendingEvaluations,
getCompletedEvaluations
} from "../controllers/teacherController";

const router = Router();

router.get("/:teacherId/stats",  getTeacherStats);
router.get("/:teacherId/videos", getTeacherVideos);
router.get('/:teacherId/evaluations/pending', getPendingEvaluations)
router.get('/:teacherId/evaluations/completed', getCompletedEvaluations)

export default router;