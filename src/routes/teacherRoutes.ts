import { Router } from "express";
import {
  getTeacherStats,
  getTeacherVideos,
  getPendingEvaluations,
  getCompletedEvaluations,
  getTeacherStudents
} from "../controllers/teacherController";
import { getTeacherProtocolStats } from "../controllers/teacherController/getTeacherProtocolStats";

const router = Router();

router.get("/:teacherId/stats", getTeacherStats);
router.get("/:teacherId/videos", getTeacherVideos);
router.get("/:teacherId/evaluations/pending", getPendingEvaluations);
router.get("/:teacherId/evaluations/completed", getCompletedEvaluations);
router.get("/:teacherId/students", getTeacherStudents);
router.get('/:teacherId/statistics/protocols', getTeacherProtocolStats)


export default router;
