import { db } from '../config/db';

async function migrate() {
    console.log('Starting v1.5 migrations...');

    try {
        // 1. Alter tickets table
        console.log('Adding primary_assignee_id to tickets...');
        await db.query(`
            ALTER TABLE tickets 
            ADD COLUMN IF NOT EXISTS "primary_assignee_id" VARCHAR(255);
        `);

        // 2. Create ticket_history table
        console.log('Creating ticket_history table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS ticket_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "ticket_id" VARCHAR(255) NOT NULL,
                "actor_id" VARCHAR(255),
                "event_type" VARCHAR(255) NOT NULL,
                "event_data" JSONB,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Create ticket_collaborators table
        console.log('Creating ticket_collaborators table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS ticket_collaborators (
                "ticket_id" VARCHAR(255) NOT NULL,
                "user_id" VARCHAR(255) NOT NULL,
                "role" VARCHAR(255) NOT NULL DEFAULT 'collaborator',
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY ("ticket_id", "user_id")
            );
        `);

        console.log('Migrations completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
