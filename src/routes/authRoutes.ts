import { Router, Request, Response } from 'express';
import passport from '../config/passport';
import { login } from '../controllers/authController/loginController';
import { register } from '../controllers/authController/registerController';
import { AuthRequest, AuthUser } from '../types/auth';
import logger from '../config/logger';

const router = Router();

router.post('/login', login);
router.post('/register', register);

router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
    '/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/login'
    }),
    (req: Request, res: Response) => {
        const { token, ...user } = req.user as AuthUser;
        const frontendURL = process.env.CORS_ORIGIN;
        const userDataBase64 = Buffer.from(JSON.stringify(user)).toString('base64');
        const redirectURL = `${frontendURL}/auth/google/callback?token=${token}&userData=${userDataBase64}`;
        res.redirect(redirectURL);
        logger.info(`Inicio de sesión exitoso para email: ${user.user.email}`);
    }
);

export default router;
