import { Router, Request, Response, NextFunction } from "express";
import { authenticateToken } from "../middleware/authenticateToken";
import { getStudentMaterials } from "../controllers/materialController/getStudentMaterials";
import { getMaterialStats } from "../controllers/materialController/getMaterialStats";
import { createMaterial } from "../controllers/materialController/createMaterial";
import { getMaterialAssignments } from "../controllers/materialController/getMaterialAssignments";

const router = Router();

// 1) Estadísticas globales del profesor
router.get(
  "/summary",
  (req: Request, res: Response, next: NextFunction) =>
    authenticateToken(req, res, next),
  (req: Request, res: Response, next: NextFunction) =>
    getMaterialStats(req, res, next)
);

// 2) Materiales de un estudiante concreto
router.get(
  "/student/:id",
  (req: Request, res: Response, next: NextFunction) => {
    void getStudentMaterials(req, res, next);
  }
);

// 3) Crear material (profesor autenticado)
router.post(
  "/",
  (req: Request, res: Response, next: NextFunction) =>
    authenticateToken(req, res, next),
  (req: Request, res: Response, next: NextFunction) =>
    createMaterial(req, res, next)
);

// 4) Asignaciones de un material (profesor autenticado)
router.get(
  "/:id/assignments",
  (req: Request, res: Response, next: NextFunction) =>
    authenticateToken(req, res, next),
  (req: Request, res: Response, next: NextFunction) =>
    getMaterialAssignments(req, res, next)
);

export default router;