import { Router, Response, NextFunction } from "express";
import { 
  getDashboardData, 
  assignTeacherToStudent, 
  getAssignments,
  getUsuariosPorRol,
  getUsuariosPorMes,
  getEstudiosPorMes,
  getTasaFinalizacionEstudios,
  getTopProfesoresEvaluaciones,
  getVideoClipsPorMes,
  getMaterialPorTipo,
  getUsuariosPorPromedio
} from "../controllers/adminController";
import { authenticateToken, AuthenticatedRequest } from "../middleware/authenticateToken";

const router = Router();

// Middleware para verificar que el usuario es administrador
const checkAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ msg: "Acceso denegado. Solo administradores pueden acceder a esta ruta." });
  }
  next();
};

// Middleware compuesto para autenticación y verificación de rol admin
const authAdminMiddleware = [
  (req: any, res: Response, next: NextFunction) => { authenticateToken(req, res, next); },
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => { checkAdmin(req, res, next); }
];

// Ruta para obtener datos del dashboard
router.get("/dashboard", authAdminMiddleware, getDashboardData);

// Ruta para asignar profesor a estudiante
router.post("/assign-teacher", authAdminMiddleware, assignTeacherToStudent);

// Ruta para obtener todas las asignaciones profesor-estudiante
router.get("/assignments", authAdminMiddleware, getAssignments);

// Rutas de métricas para el dashboard
router.get("/metricas/usuarios-por-rol", authAdminMiddleware, getUsuariosPorRol);
router.get("/metricas/usuarios-por-mes", authAdminMiddleware, getUsuariosPorMes);
router.get("/metricas/estudios-por-mes", authAdminMiddleware, getEstudiosPorMes);
router.get("/metricas/tasa-finalizacion-estudios", authAdminMiddleware, getTasaFinalizacionEstudios);
router.get("/metricas/top-profesores-evaluaciones", authAdminMiddleware, getTopProfesoresEvaluaciones);
router.get("/metricas/video-clips-por-mes", authAdminMiddleware, getVideoClipsPorMes);
router.get("/metricas/material-por-tipo", authAdminMiddleware, getMaterialPorTipo);
router.get("/metricas/usuarios-por-promedio", authAdminMiddleware, getUsuariosPorPromedio);

export default router; 