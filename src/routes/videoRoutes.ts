import { Router } from "express";
import { generateUploadUrl } from "../controllers/videoController/uploadVideo";
import { generateDownloadUrl } from "../controllers/videoController/getVideo";

const router = Router();

router.post("/generate_upload_url", generateUploadUrl);
router.get("/generate_download_url/:key", generateDownloadUrl);

export default router;
