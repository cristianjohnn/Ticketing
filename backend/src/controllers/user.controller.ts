import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { db } from '../config/db';
import bcrypt from 'bcryptjs';

export class UserController {
    public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { search } = req.query;
            const users = await UserService.getAll({ search: search as string });
            res.json(users);
        } catch (err) {
            next(err);
        }
    }

    public static async getActiveByRole(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const role = String(req.query.role || 'it-support');
            const users = await UserService.getActiveByRole(role);
            res.json(users);
        } catch (err) {
            next(err);
        }
    }

    public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = await UserService.getById(String(req.params.id));
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.json(user);
        } catch (err) {
            next(err);
        }
    }

    public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { username, fullName, email, password, role } = req.body;
            if (!username || !fullName || !email || !password || !role) {
                res.status(400).json({ error: 'Missing required fields: username, fullName, email, password, role' });
                return;
            }
            const user = await UserService.create({
                username,
                fullName,
                email,
                role,
                passwordPlain: password
            });
            res.status(201).json(user);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }

    public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = await UserService.update(String(req.params.id), req.body);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.json(user);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }

    public static async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const success = await UserService.deactivate(String(req.params.id));
            if (!success) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    }

    public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { password } = req.body;
            if (!password) {
                res.status(400).json({ error: 'Missing password field' });
                return;
            }
            const success = await UserService.resetPassword(String(req.params.id), password);
            if (!success) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.json({ success: true });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }

    public static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            const { currentPassword, newPassword, confirmPassword } = req.body;

            if (!currentPassword || !newPassword || !confirmPassword) {
                res.status(400).json({ error: 'All fields are required: currentPassword, newPassword, confirmPassword.' });
                return;
            }

            if (newPassword !== confirmPassword) {
                res.status(400).json({ error: 'New password and confirmation do not match.' });
                return;
            }

            // Fetch full user record with password hash
            const fullUser = await UserService.getByUsername(user.username);
            if (!fullUser) {
                res.status(404).json({ error: 'User not found.' });
                return;
            }

            // Verify current password
            const isMatch = bcrypt.compareSync(currentPassword, fullUser.password || '');
            if (!isMatch) {
                res.status(401).json({ error: 'Current password is incorrect.' });
                return;
            }

            // Reject same password
            const isSame = bcrypt.compareSync(newPassword, fullUser.password || '');
            if (isSame) {
                res.status(400).json({ error: 'New password must be different from your current password.' });
                return;
            }

            // Enforce password policy
            if (!UserService.validatePasswordStrength(newPassword)) {
                res.status(400).json({ error: 'Password must be at least 8 characters long and contain at least one letter and one number.' });
                return;
            }

            // Update password
            await UserService.resetPassword(user.id, newPassword);

            // Invalidate all sessions for this user except the current one
            const currentToken = req.headers.authorization?.split(' ')[1];
            if (currentToken) {
                await db.query('DELETE FROM sessions WHERE "userId" = $1 AND id != $2', [user.id, currentToken]);
            } else {
                await db.query('DELETE FROM sessions WHERE "userId" = $1', [user.id]);
            }

            res.json({ success: true, message: 'Password changed successfully. All other sessions have been invalidated.' });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }
}
