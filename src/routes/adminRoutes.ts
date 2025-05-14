import { Router, Response, NextFunction } from "express";
import { getDashboardData, assignTeacherToStudent, getAssignments } from "../controllers/adminController";
import { authenticateToken, AuthenticatedRequest } from "../middleware/authenticateToken";

const router = Router();

// Middleware para verificar que el usuario es administrador
const checkAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ msg: "Acceso denegado. Solo administradores pueden acceder a esta ruta." });
  }
  next();
};

// Ruta para obtener datos del dashboard
router.get("/dashboard", 
  (req, res, next) => { authenticateToken(req, res, next); },
  (req, res, next) => { checkAdmin(req as AuthenticatedRequest, res, next); },
  getDashboardData
);

// Ruta para asignar profesor a estudiante
router.post("/assign-teacher", 
  (req, res, next) => { authenticateToken(req, res, next); },
  (req, res, next) => { checkAdmin(req as AuthenticatedRequest, res, next); },
  assignTeacherToStudent
);

// Ruta para obtener todas las asignaciones profesor-estudiante
router.get("/assignments", 
  (req, res, next) => { authenticateToken(req, res, next); },
  (req, res, next) => { checkAdmin(req as AuthenticatedRequest, res, next); },
  getAssignments
);

export default router; 