import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        console.log('Running migrations...');
        
        // 1. Add Unique constraint to ticket_collaborators if not exists
        try {
            await pool.query(`
                ALTER TABLE ticket_collaborators 
                ADD CONSTRAINT unique_ticket_collaborator UNIQUE (ticket_id, user_id);
            `);
            console.log('Added unique constraint to ticket_collaborators');
        } catch (e: any) {
            console.log('Unique constraint already exists or failed:', e.message);
        }

        // 2. Create ticket_collaboration_requests table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ticket_collaboration_requests (
                id UUID PRIMARY KEY,
                ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                requester_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                approver_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
                responded_at TIMESTAMPTZ,
                rejection_reason TEXT,
                cancelled_at TIMESTAMPTZ,
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('Created ticket_collaboration_requests table');

        // 3. Add target_user_id to ticket_collaboration_requests if not exists
        try {
            await pool.query(`
                ALTER TABLE ticket_collaboration_requests 
                ADD COLUMN IF NOT EXISTS target_user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE;
            `);
            console.log('Added target_user_id to ticket_collaboration_requests');
        } catch (e: any) {
            console.log('Failed to add target_user_id column:', e.message);
        }

        // 4. Create partial unique index
        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_collab_req 
            ON ticket_collaboration_requests (ticket_id, requester_id) 
            WHERE status = 'pending';
        `);
        console.log('Created partial unique index for pending requests');

        // 5. Create notifications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(50) PRIMARY KEY,
                recipient_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                actor_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
                type VARCHAR(50) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                metadata JSONB,
                read_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('Created notifications table');

        // 6. Create index on recipient_id
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id 
            ON notifications (recipient_id);
        `);
        console.log('Created index on notifications.recipient_id');

        // 7. Create ticket_transfer_requests table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ticket_transfer_requests (
                id UUID PRIMARY KEY,
                ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                requester_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                target_user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                rejection_reason TEXT,
                responded_at TIMESTAMPTZ,
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('Created ticket_transfer_requests table');

        // 8. Create partial unique index to allow only one pending transfer per ticket
        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_transfer_req 
            ON ticket_transfer_requests (ticket_id) 
            WHERE status = 'pending';
        `);
        console.log('Created partial unique index for pending transfer requests');

        // 9. Add resolved_at and resolving_assignee_id to tickets table
        try {
            await pool.query(`
                ALTER TABLE tickets 
                ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS resolving_assignee_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL;
            `);
            console.log('Added resolved_at and resolving_assignee_id columns to tickets');
        } catch (e: any) {
            console.log('Failed to add resolved_at / resolving_assignee_id columns to tickets:', e.message);
        }

        // 10. Create ticket_ratings table (1:1 with tickets, immutable CSAT records)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ticket_ratings (
                id VARCHAR(50) PRIMARY KEY,
                ticket_id VARCHAR(50) NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
                client_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                technician_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                feedback TEXT,
                response_time_seconds INTEGER CHECK (response_time_seconds IS NULL OR response_time_seconds >= 0),
                submitted_from VARCHAR(50) DEFAULT 'web_portal' CHECK (submitted_from IN ('web_portal', 'mobile', 'api', 'email', 'system')),
                client_version VARCHAR(50),
                device VARCHAR(100),
                submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('Created ticket_ratings table');

        // Apply CHECK constraints to existing table if created previously
        try {
            await pool.query(`
                ALTER TABLE ticket_ratings 
                ADD CONSTRAINT chk_ticket_ratings_response_time CHECK (response_time_seconds IS NULL OR response_time_seconds >= 0);
            `);
        } catch (e: any) {
            // Already exists or passed
        }

        try {
            await pool.query(`
                ALTER TABLE ticket_ratings 
                ADD CONSTRAINT chk_ticket_ratings_submitted_from CHECK (submitted_from IN ('web_portal', 'mobile', 'api', 'email', 'system'));
            `);
        } catch (e: any) {
            // Already exists or passed
        }

        // 11. Drop redundant indexes if present
        try {
            await pool.query(`DROP INDEX IF EXISTS idx_ticket_ratings_ticket_id;`);
            await pool.query(`DROP INDEX IF EXISTS idx_ticket_ratings_technician_id;`);
            await pool.query(`DROP INDEX IF EXISTS idx_ticket_ratings_client_id;`);
        } catch (e: any) {
            // Safe ignore
        }

        // 12. Create optimized composite & resolution indexes for analytics and lookups
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_ticket_ratings_technician_submitted ON ticket_ratings (technician_id, submitted_at DESC);
            CREATE INDEX IF NOT EXISTS idx_ticket_ratings_client_submitted ON ticket_ratings (client_id, submitted_at DESC);
            CREATE INDEX IF NOT EXISTS idx_ticket_ratings_submitted_at ON ticket_ratings (submitted_at DESC);
            CREATE INDEX IF NOT EXISTS idx_tickets_resolved_at ON tickets (resolved_at);
        `);
        console.log('Created optimized composite analytics indexes for ticket_ratings and tickets.resolved_at');

        // 13. Add analytics fields to tickets table
        try {
            await pool.query(`
                ALTER TABLE tickets 
                ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS reopen_count INTEGER DEFAULT 0;
            `);
            console.log('Added first_response_at and reopen_count to tickets table');
        } catch (e: any) {
            console.log('Failed to add analytics columns to tickets:', e.message);
        }

        // 14. Create saved_reports table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS saved_reports (
                id UUID PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                filters JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('Created saved_reports table');

        // 15. Create saved_reports index and additional tickets analytics indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_saved_reports_user_id ON saved_reports (user_id);
            CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets ("createdAt");
            CREATE INDEX IF NOT EXISTS idx_tickets_first_response_at ON tickets (first_response_at);
            CREATE INDEX IF NOT EXISTS idx_tickets_department_status ON tickets (department, status);
        `);
        console.log('Created Phase 5 analytics indexes');

    } catch (e: any) {
        console.error('Migration failed', e);
    } finally {
        await pool.end();
    }
}

run();
