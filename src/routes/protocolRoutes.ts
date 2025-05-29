import { Router } from "express";
import { getProtocol } from "../controllers/protocolController";

const router = Router();
router.get("/:key", getProtocol);
export default router;
