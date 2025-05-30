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
  getUsuariosPorPromedio,
  autorizarProfesor,
  getProfesoresPendientes,
  rechazarProfesor,
  createProtocol,
  getProtocolById,
  updateProtocol // ⬅️ Asegúrate de tener esta función en el controller
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

// Rutas existentes
router.get("/dashboard", authAdminMiddleware, getDashboardData);
router.post("/assign-teacher", authAdminMiddleware, assignTeacherToStudent);
router.get("/assignments", authAdminMiddleware, getAssignments);

// Métricas
router.get("/metricas/usuarios-por-rol", authAdminMiddleware, getUsuariosPorRol);
router.get("/metricas/usuarios-por-mes", authAdminMiddleware, getUsuariosPorMes);
router.get("/metricas/estudios-por-mes", authAdminMiddleware, getEstudiosPorMes);
router.get("/metricas/tasa-finalizacion-estudios", authAdminMiddleware, getTasaFinalizacionEstudios);
router.get("/metricas/top-profesores-evaluaciones", authAdminMiddleware, getTopProfesoresEvaluaciones);
router.get("/metricas/video-clips-por-mes", authAdminMiddleware, getVideoClipsPorMes);
router.get("/metricas/material-por-tipo", authAdminMiddleware, getMaterialPorTipo);
router.get("/metricas/usuarios-por-promedio", authAdminMiddleware, getUsuariosPorPromedio);

// Profesores
router.patch("/usuarios/:id/autorizar", authAdminMiddleware, autorizarProfesor);
router.delete("/usuarios/:id/rechazar", authAdminMiddleware, rechazarProfesor);
router.get("/usuarios/profesores-pendientes", authAdminMiddleware, getProfesoresPendientes);

// Protocolos clínicos
router.post("/protocols", authAdminMiddleware, createProtocol);
router.get("/protocols/:id", authAdminMiddleware, getProtocolById);
router.put("/protocols/:id", authAdminMiddleware, updateProtocol);

export default router;