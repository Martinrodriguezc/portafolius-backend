import { Router } from "express";
import {
  getTeacherStats,
  getTeacherVideos,
} from "../controllers/teacherController";

const router = Router();

router.get("/:teacherId/stats",  getTeacherStats);
router.get("/:teacherId/videos", getTeacherVideos);

export default router;