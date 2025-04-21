import { Router } from "express";
import { generateUploadUrl } from "../controllers/videoController/uploadVideo";
import { generateDownloadUrl } from "../controllers/videoController/downloadVideo";
import { getVideoMetadata } from "../controllers/videoController/getVideoMetadata";

const router = Router();

router.post("/generate_upload_url", generateUploadUrl);
router.get("/generate_download_url/:clipId", generateDownloadUrl);
router.get("/:id/meta", getVideoMetadata)


export default router;
