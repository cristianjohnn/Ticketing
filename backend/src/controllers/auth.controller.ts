import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { db } from '../config/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class AuthController {
    public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                res.status(400).json({ error: 'Missing username or password' });
                return;
            }

            const user = await UserService.getByUsername(username);
            if (!user) {
                res.status(401).json({ error: 'Invalid username or password' });
                return;
            }

            // Check password
            const isMatch = bcrypt.compareSync(password, user.password || '');
            if (!isMatch) {
                res.status(401).json({ error: 'Invalid username or password' });
                return;
            }

            // Check if user is active
            if (Number(user.active) !== 1) {
                res.status(403).json({ error: 'Your account is deactivated. Please contact an administrator.' });
                return;
            }

            // Generate token and session
            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            await db.query(`
                INSERT INTO sessions (id, "userId", "expiresAt") VALUES ($1, $2, $3)
            `, [token, user.id, new Date(expiresAt)]);

            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    token
                }
            });
        } catch (err) {
            next(err);
        }
    }

    public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { fullName, username, email, password } = req.body;
            if (!fullName || !username || !email || !password) {
                res.status(400).json({ error: 'All fields are required.' });
                return;
            }

            // Client role is hardcoded for self-registration
            const user = await UserService.create({
                username,
                fullName,
                email,
                role: 'client',
                passwordPlain: password
            });

            res.status(201).json({
                success: true,
                user
            });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }

    public static async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                res.status(401).json({ error: 'No token provided' });
                return;
            }

            const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [token]);
            const session = sessionRes.rows[0] as { userId: string, expiresAt: any } | undefined;
            if (!session) {
                res.status(401).json({ error: 'Invalid or expired session' });
                return;
            }

            const expiresDate = session.expiresAt instanceof Date ? session.expiresAt : new Date(session.expiresAt);
            // Check if expired
            if (expiresDate < new Date()) {
                await db.query('DELETE FROM sessions WHERE id = $1', [token]);
                res.status(401).json({ error: 'Session expired' });
                return;
            }

            const user = await UserService.getById(session.userId);
            if (!user || Number(user.active) !== 1) {
                res.status(401).json({ error: 'User account is inactive or not found' });
                return;
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    token
                }
            });
        } catch (err) {
            next(err);
        }
    }

    public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];

            if (token) {
                await db.query('DELETE FROM sessions WHERE id = $1', [token]);
            }

            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    }
}
