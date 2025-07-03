import { Router } from "express";
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUserByAdmin,
  changePassword,
} from "../controllers/userController";
import { authenticateToken } from "../middleware/authenticateToken";

const router = Router();

router.use(authenticateToken);

router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.post("/admin/create", createUserByAdmin);
router.put("/:id/password", authenticateToken, changePassword);
export default router;
