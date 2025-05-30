import { Router, Response, NextFunction } from "express";
import {
  getStudentMaterials,
  getAllMaterials,
  uploadMaterial,
  updateMaterial,
  deleteMaterial
} from "../controllers/materialController";

import { authenticateToken, AuthenticatedRequest } from "../middleware/authenticateToken";

const router = Router();

// Middleware para verificar que el usuario es profesor o administrador
const checkTeacherOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'profesor' && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Acceso denegado. Solo profesores y administradores pueden acceder a esta ruta."
    });
  }
  next();
};

// Middleware combinado
const authTeacherAdminMiddleware = [authenticateToken, checkTeacherOrAdmin];

// 📁 Rutas activas
router.get("/student/:id", getStudentMaterials);
router.get("/all", authTeacherAdminMiddleware, getAllMaterials);
router.post("/", authTeacherAdminMiddleware, uploadMaterial);
router.put("/:id", authTeacherAdminMiddleware, updateMaterial);
router.delete("/:id", authTeacherAdminMiddleware, deleteMaterial);

export default router;
