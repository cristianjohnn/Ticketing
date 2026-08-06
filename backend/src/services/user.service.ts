import { db } from '../config/db';
import { User } from '../types';
import bcrypt from 'bcryptjs';

export class UserService {
    public static validatePasswordStrength(password: string): boolean {
        if (!password || password.length < 8) return false;
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        return hasLetter && hasNumber;
    }

    public static async getAll(filters: { search?: string } = {}): Promise<User[]> {
        const res = await db.query(`
            SELECT id, username, "fullName", email, role, active, "createdAt", "updatedAt"
            FROM users
            ORDER BY "createdAt" DESC
        `);
        let users = res.rows as User[];
        
        if (filters.search) {
            const q = filters.search.toLowerCase();
            users = users.filter(u =>
                u.username.toLowerCase().includes(q) ||
                u.fullName.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.role.toLowerCase().includes(q)
            );
        }
        return users;
    }

    public static async getActiveByRole(role: string): Promise<User[]> {
        const res = await db.query(`
            SELECT id, username, "fullName", email, role, active, "createdAt", "updatedAt"
            FROM users
            WHERE role = $1
        `, [role]);
        const users = res.rows as User[];
        return users.filter(u => Number(u.active) === 1);
    }

    public static async getById(id: string): Promise<User | null> {
        const res = await db.query(`
            SELECT id, username, "fullName", email, role, active, "createdAt", "updatedAt"
            FROM users
            WHERE id = $1
        `, [id]);
        return (res.rows[0] as User) || null;
    }

    public static async getByUsername(username: string): Promise<(User & { password?: string }) | null> {
        const res = await db.query(`
            SELECT id, username, "fullName", email, password, role, active, "createdAt", "updatedAt"
            FROM users
            WHERE username = $1
        `, [username]);
        return (res.rows[0] as (User & { password?: string })) || null;
    }

    public static async getByEmail(email: string): Promise<(User & { password?: string }) | null> {
        const res = await db.query(`
            SELECT id, username, "fullName", email, password, role, active, "createdAt", "updatedAt"
            FROM users
            WHERE email = $1
        `, [email]);
        return (res.rows[0] as (User & { password?: string })) || null;
    }

    public static async create(userData: Omit<User, 'id' | 'active'> & { id?: string; passwordPlain: string }): Promise<User> {
        if (!this.validatePasswordStrength(userData.passwordPlain)) {
            throw new Error('Password must be at least 8 characters long and contain at least one letter and one number.');
        }

        // Check duplicates
        const dupUser = await this.getByUsername(userData.username);
        if (dupUser) throw new Error('Username is already taken.');
        const dupEmail = await this.getByEmail(userData.email);
        if (dupEmail) throw new Error('Email is already registered.');

        const id = userData.id || `USR-${Date.now()}`;
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(userData.passwordPlain, salt);
        const now = new Date().toISOString();

        const userRecord = {
            id,
            username: userData.username.trim(),
            fullName: userData.fullName.trim(),
            email: userData.email.trim().toLowerCase(),
            password: passwordHash,
            role: userData.role,
            active: 1,
            createdAt: now,
            updatedAt: now
        };

        await db.query(`
            INSERT INTO users (id, username, "fullName", email, password, role, active, "createdAt", "updatedAt")
            VALUES (@id, @username, @fullName, @email, @password, @role, @active, @createdAt, @updatedAt)
        `, userRecord);

        return {
            id,
            username: userRecord.username,
            fullName: userRecord.fullName,
            email: userRecord.email,
            role: userRecord.role,
            active: true,
            createdAt: now,
            updatedAt: now
        };
    }

    public static async update(id: string, updateData: Partial<User>): Promise<User | null> {
        const existing = await this.getById(id);
        if (!existing) return null;

        const allowed: (keyof User)[] = ['fullName', 'email', 'role', 'active'];
        const setClauses: string[] = [];
        const values: Record<string, any> = {};

        for (const key of allowed) {
            if (updateData[key] !== undefined) {
                // Keep active as number for column compatibility
                const val = key === 'active' ? (updateData[key] ? 1 : 0) : updateData[key];
                const colName = key === 'fullName' ? '"fullName"' : `"${String(key)}"`;
                setClauses.push(`${colName} = @${String(key)}`);
                values[key] = val;
            }
        }

        if (setClauses.length > 0) {
            setClauses.push('"updatedAt" = @updatedAt');
            values.updatedAt = new Date().toISOString();
            values.id = id;

            const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = @id`;
            await db.query(sql, values);
        }

        return this.getById(id);
    }

    public static async deactivate(id: string): Promise<boolean> {
        const existing = await this.getById(id);
        if (!existing) return false;
        await db.query('UPDATE users SET active = 0, "updatedAt" = $1 WHERE id = $2', [new Date().toISOString(), id]);
        return true;
    }

    public static async resetPassword(id: string, passwordPlain: string): Promise<boolean> {
        const existing = await this.getById(id);
        if (!existing) return false;

        if (!this.validatePasswordStrength(passwordPlain)) {
            throw new Error('Password must be at least 8 characters long and contain at least one letter and one number.');
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(passwordPlain, salt);
        await db.query('UPDATE users SET password = $1, "updatedAt" = $2 WHERE id = $3', [hashedPassword, new Date().toISOString(), id]);
        return true;
    }
}
