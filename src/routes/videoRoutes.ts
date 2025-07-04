import { Router } from "express";
import { generateUploadUrl, uploadCallback } from "../controllers/videoController/uploadVideo";
import { generateDownloadUrl } from "../controllers/videoController/downloadVideo";
import { getVideoMetadata } from "../controllers/videoController/getVideoMetadata";
import { getAllTags } from "../controllers/videoController/getTags";
import { getTagsUtils } from "../controllers/videoController/getTagsUtils";
import { assignTagsToClip } from "../controllers/videoController/assignTagsToClip";
import { getThumbnailDownloadUrl } from "../controllers/thumbnailController/getThumbnailDownloadUrl";
import { checkVideoEvaluation, getVideoWithEvaluationDetails } from "../controllers/videoController/checkVideoEvaluation";

const router = Router();

router.post("/generate_upload_url", generateUploadUrl);
router.get("/generate_download_url/:clipId", generateDownloadUrl);
router.get("/:id/meta", getVideoMetadata);
router.get("/tags", getAllTags);
router.post("/:clipId/tags", assignTagsToClip);
router.get("/tag_utils", getTagsUtils);
router.post("/upload-callback", uploadCallback)
router.get('/:videoId/thumbnail-download-url', getThumbnailDownloadUrl)

router.get("/:clipId/evaluation/check", checkVideoEvaluation);
router.get("/:clipId/evaluation/details", getVideoWithEvaluationDetails);

export default router;
