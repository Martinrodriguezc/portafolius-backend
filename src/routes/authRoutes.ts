import { Router, Request, Response } from 'express';
import passport from '../config/passport';
import { login } from '../controllers/authController/loginController';
import { register } from '../controllers/authController/registerController';

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
        const { token, user } = req.user as any;

        res.json({ msg: 'OAuth login exitoso', token, user });
    }
);

export default router;
