import { Router } from "express";
import { generateUploadUrl } from "../controllers/videoController/uploadVideo";
import { generateDownloadUrl } from "../controllers/videoController/downloadVideo";
import { getVideoMetadata } from "../controllers/videoController/getVideoMetadata";
import { getAllTags } from "../controllers/videoController/getTags";


const router = Router();

router.post("/generate_upload_url", generateUploadUrl);
router.get("/generate_download_url/:clipId", generateDownloadUrl);
router.get("/:id/meta", getVideoMetadata);
router.get("/tags", getAllTags);

export default router;
