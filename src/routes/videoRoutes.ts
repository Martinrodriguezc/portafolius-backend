import { Router } from "express";
import { generateUploadUrl } from "../controllers/videoController/uploadVideo";
import { generateDownloadUrl } from "../controllers/videoController/downloadVideo";
import { getVideoMetadata } from "../controllers/videoController/getVideoMetadata";
import { getAllTags } from "../controllers/videoController/getTags";
import { getTagsUtils } from "../controllers/videoController/getTagsUtils";
import { processAndUploadVideo } from "../controllers/videoController/processAndUploadVideo";

const router = Router();

router.post("/generate_upload_url", generateUploadUrl);
router.post("/process_and_upload", processAndUploadVideo);
router.get("/generate_download_url/:clipId", generateDownloadUrl);
router.get("/:id/meta", getVideoMetadata);
router.get("/tags", getAllTags);
router.get("/tag_utils", getTagsUtils);

export default router;
