import { Pool, PoolClient } from 'pg';

export interface TxContext {
    client: PoolClient;
    addPostCommitHook: (hook: () => void | Promise<void>) => void;
    query: (sql: string, params?: any) => Promise<any>;
}
import { ENV } from './env';
import bcrypt from 'bcryptjs';
import { parseQuery } from '../utils/dbParser';

const pool = new Pool({
    connectionString: ENV.DATABASE_URL
});

export const db = {
    pool,
    // Helper to query with named parameter support (converting @name -> $1, $2, etc.)
    async query(sql: string, params?: any) {
        if (!params) {
            return pool.query(sql);
        }
        const { text, values } = parseQuery(sql, params);
        return pool.query(text, values);
    },
    
    // Execute a callback inside a transaction, providing a TxContext
    async withTransaction<T>(callback: (tx: TxContext) => Promise<T>): Promise<T> {
        const client = await pool.connect();
        const postCommitHooks: Array<() => void | Promise<void>> = [];
        
        const tx: TxContext = {
            client,
            addPostCommitHook: (hook) => postCommitHooks.push(hook),
            query: async (sql: string, params?: any) => {
                if (!params) {
                    return client.query(sql);
                }
                const { text, values } = parseQuery(sql, params);
                return client.query(text, values);
            }
        };

        try {
            await client.query('BEGIN');
            const result = await callback(tx);
            await client.query('COMMIT');
            
            // Execute post-commit hooks after successful commit
            for (const hook of postCommitHooks) {
                try {
                    await hook();
                } catch (err) {
                    console.error('Post-commit hook failed:', err);
                }
            }
            
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
};

// Seed default admin account if not exists
export async function seedAdmin(): Promise<void> {
    try {
        const adminRes = await db.query('SELECT 1 FROM users WHERE role = $1', ['admin']);
        if (adminRes.rowCount === 0) {
            const adminId = 'USR-admin';
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(ENV.ADMIN_PASSWORD, salt);
            const now = new Date().toISOString();
            await db.query(`
                INSERT INTO users (id, username, "fullName", email, password, role, active, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8)
            `, [adminId, 'admin', 'System Administrator', 'admin@support.com', hashedPassword, 'admin', now, now]);
            console.log('[Database] Default admin account seeded.');
        }
    } catch (err) {
        console.error('Failed to seed default admin:', err);
    }
}

// In server.ts or on application startup, seed admin is called
seedAdmin().catch(console.error);

export default db;
