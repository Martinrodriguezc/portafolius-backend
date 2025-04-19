import { Router } from "express";
import { generateUploadUrl } from "../controllers/videoController/uploadVideo";
import { generateDownloadUrl } from "../controllers/videoController/downloadVideo";

const router = Router();

router.post("/generate_upload_url", generateUploadUrl);
router.get("/generate_download_url/:clipId", generateDownloadUrl);

export default router;
