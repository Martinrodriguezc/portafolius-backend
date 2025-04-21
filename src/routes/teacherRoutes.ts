import { Router } from 'express';
import { getAllVideosWithStudent } from '../controllers/teacherController/getAllVideosWithStudent';

const router = Router();

router.get('/study-with-student', getAllVideosWithStudent);

export default router;
