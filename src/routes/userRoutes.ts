import { Router } from "express";
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUserByAdmin,
} from "../controllers/userController";
import { authenticateToken } from "../middleware/authenticateToken";

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(authenticateToken);

router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.post("/admin/create", createUserByAdmin);
export default router;
