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

// Middleware compuesto para autenticación y verificación de rol profesor/admin
const authTeacherAdminMiddleware = [
  (req: any, res: Response, next: NextFunction) => { authenticateToken(req, res, next); },
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => { checkTeacherOrAdmin(req, res, next); }
];

// Rutas existentes
router.get("/summary",      getMaterialStats);
router.get("/student/:id",  getStudentMaterials);

// Nuevas rutas para profesores y administradores
router.get("/all", authTeacherAdminMiddleware, getAllMaterials);
router.post("/", authTeacherAdminMiddleware, uploadMaterial);
router.put("/:id", authTeacherAdminMiddleware, updateMaterial);
router.delete("/:id", authTeacherAdminMiddleware, deleteMaterial);
router.post("/",            authenticateToken, upload.single("file"), createMaterial);
router.get("/:id/assignments", getMaterialAssignments);
router.get("/download/:id", downloadMaterial);


router.get("/download/:id", downloadMaterial);

export default router;