import { Router } from "express";
import { generateUploadUrl } from "../controllers/videoController/uploadVideo";
import { generateDownloadUrl } from "../controllers/videoController/downloadVideo";
import { getVideoMetadata } from "../controllers/videoController/getVideoMetadata";
import { getAllTags } from "../controllers/videoController/getTags";
import { getTagsUtils } from "../controllers/videoController/getTagsUtils";
import { assignTagsToClip } from "../controllers/videoController/assignTagsToClip";

const router = Router();

router.post("/generate_upload_url", generateUploadUrl);
router.get("/generate_download_url/:clipId", generateDownloadUrl);
router.get("/:id/meta", getVideoMetadata);
router.get("/tags", getAllTags);
router.post("/:clipId/tags", assignTagsToClip);
router.get("/tag_utils", getTagsUtils);

export default router;
