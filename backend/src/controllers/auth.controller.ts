import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';

export class AuthController {
    public static login(req: Request, res: Response, next: NextFunction): void {
        try {
            const { role, password } = req.body;
            
            if (role === 'admin') {
                if (password === ENV.ADMIN_PASSWORD) {
                    res.json({ success: true, message: 'Authenticated' });
                } else {
                    res.status(401).json({ error: 'Incorrect admin password' });
                }
            } else {
                // Client login doesn't require password currently
                res.json({ success: true, message: 'Authenticated' });
            }
        } catch (err) {
            next(err);
        }
    }
}
