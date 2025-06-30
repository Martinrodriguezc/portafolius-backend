import { Router } from 'express'
import { authenticateToken } from '../middleware/authenticateToken'
import { getStudentDashboardMetrics } from '../controllers/metricsController/getStudentDashboardMetrics'
import { getRecentComments } from '../controllers/studyController/getRecentComments'
import { getStudentStats } from '../controllers/metricsController/getStudentStats'
import { getInteractionMetrics } from '../controllers/metricsController/getInteractionMetrics';

const router = Router()

router.get('/:id/comments', getRecentComments)
router.get('/:id/dashboard-metrics', authenticateToken, getStudentDashboardMetrics)
router.get('/:id/student-stats', getStudentStats)
router.get('/:studentId/interaction-metrics', authenticateToken, getInteractionMetrics)

export default router