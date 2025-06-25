import { Router } from 'express';
import {
  createStudentInteraction,
  createProfessorInteraction,
  getInteractionsByClip
} from '../controllers/interactionController/interactionController';

const router = Router();
router.post('/:clipId/interaction', createStudentInteraction);
router.post('/:clipId/interaction/review', createProfessorInteraction);
router.get('/:clipId/interaction',    getInteractionsByClip);
export default router;