import { Router } from 'express';
import {
  createStudentInteraction,
  createProfessorInteraction,
  getInteractionsByClip
} from '../controllers/interactionController/interactionController';

import { authenticateToken } from '../middleware/authenticateToken';

const router = Router();
router.use(authenticateToken);
router.post('/:clipId/interaction', createStudentInteraction);
router.post('/:clipId/interaction/review', authenticateToken, createProfessorInteraction);
router.get('/:clipId/interaction',    getInteractionsByClip);
export default router;