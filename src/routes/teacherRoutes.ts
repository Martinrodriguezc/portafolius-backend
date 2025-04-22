import { Router } from "express";
import {
  getTeacherStats,
  getTeacherVideos,
  getPendingEvaluations,
  getCompletedEvaluations,
  getTeacherStudents,
} from "../controllers/teacherController";

const router = Router();

router.get("/:teacherId/stats", getTeacherStats);
router.get("/:teacherId/videos", getTeacherVideos);
router.get("/:teacherId/evaluations/pending", getPendingEvaluations);
router.get("/:teacherId/evaluations/completed", getCompletedEvaluations);
router.get("/:teacherId/students", getTeacherStudents);

export default router;