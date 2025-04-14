import { Router } from 'express';
import { generateUploadUrl } from '../controllers/videoController';


const router = Router();

router.post('/generate_url', generateUploadUrl);

export default router;
