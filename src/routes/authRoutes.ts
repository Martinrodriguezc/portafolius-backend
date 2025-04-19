import { Router } from 'express';
import { login } from '../controllers/authController/loginController';
import { register } from '../controllers/authController/registerController';

const router = Router();

router.post('/login', login);
router.post('/register', register);

export default router;
