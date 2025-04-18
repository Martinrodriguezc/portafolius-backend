import passport from 'passport';
import bcrypt from 'bcrypt';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { pool } from './db';
import { config } from './index';  // lee tu JWT_SECRET  
import logger from './logger';

passport.use(new GoogleStrategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.OAUTH_CALLBACK_URL!,
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done) => {
        try {
            const email = profile.emails?.[0]?.value!;
            const result = await pool.query('SELECT * FROM Users WHERE email=$1', [email]);
            let user = result.rows[0];

            if (!user) {
                const { givenName: first_name, familyName: last_name } = profile.name!;
                const fakePassword = Math.random().toString(36).substring(2, 15);
                const hashed = await bcrypt.hash(fakePassword, 10);
                const insert = await pool.query(
                    `INSERT INTO Users (first_name, last_name, email, role, password)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
                    [first_name, last_name, email, 'estudiante', hashed]
                );
                user = insert.rows[0];
                logger.info('Usuario OAuth creado:', email);
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                config.JWT_SECRET,
                { expiresIn: '1h' }
            );

            return done(null, { user, token });
        } catch (err) {
            logger.error('Error en GoogleStrategy:', err);
            return done(err as Error);
        }
    }
));

export default passport;
