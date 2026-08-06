import Database from 'better-sqlite3';
import { ENV } from './env';

const db = new Database(ENV.DB_PATH);

// Configure SQLite pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
        id            TEXT PRIMARY KEY,
        title         TEXT NOT NULL,
        description   TEXT DEFAULT '',
        category      TEXT DEFAULT 'Other',
        department    TEXT NOT NULL,
        priority      TEXT DEFAULT 'Medium',
        severity      TEXT DEFAULT 'Moderate',
        status        TEXT DEFAULT 'Open',
        assignee      TEXT DEFAULT 'Unassigned',
        requester     TEXT NOT NULL,
        rating        INTEGER DEFAULT NULL,
        ratingComment TEXT DEFAULT '',
        createdAt     TEXT NOT NULL,
        updatedAt     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        ticketId TEXT NOT NULL,
        text     TEXT NOT NULL,
        author   TEXT NOT NULL,
        time     TEXT NOT NULL,
        FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS articles (
        id        TEXT PRIMARY KEY,
        title     TEXT NOT NULL,
        content   TEXT NOT NULL,
        category  TEXT DEFAULT 'General',
        author    TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attachments (
        id           TEXT PRIMARY KEY,
        ticketId     TEXT NOT NULL,
        filename     TEXT NOT NULL,
        originalname TEXT NOT NULL,
        size         INTEGER NOT NULL,
        uploadedAt   TEXT NOT NULL,
        FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
    );
`);

// Safe migration checks for schema updates
try {
    // Add dueAt column for SLA Tracking if it doesn't already exist
    db.exec('ALTER TABLE tickets ADD COLUMN dueAt TEXT DEFAULT ""');
} catch (e) {
    // Column likely already exists
}

try {
    // Add ratingRequested column for prompting users to rate resolved tickets
    db.exec('ALTER TABLE tickets ADD COLUMN ratingRequested INTEGER DEFAULT 0');
} catch (e) {
    // Column likely already exists
}

try {
    // Add sortOrder column for article ordering
    db.exec('ALTER TABLE articles ADD COLUMN sortOrder INTEGER DEFAULT 0');
    // Set initial sort order based on existing rows if not already populated
    const existingArticles = db.prepare('SELECT id FROM articles ORDER BY updatedAt DESC').all() as { id: string }[];
    existingArticles.forEach((a, i) => {
        db.prepare('UPDATE articles SET sortOrder = ? WHERE id = ?').run(i, a.id);
    });
} catch (e) {
    // Column likely already exists
}

console.log('[Database] Connection initialized and schemas validated.');

export default db;
export { db };
