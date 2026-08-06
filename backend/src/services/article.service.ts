import { db } from '../config/db';
import { Article } from '../types';

export class ArticleService {
    public static async getAll(search?: string): Promise<Article[]> {
        const res = await db.query('SELECT * FROM articles ORDER BY "sortOrder" ASC, "updatedAt" DESC');
        let articles = res.rows as Article[];
        
        // Ensure date objects are mapped to ISO strings
        articles = articles.map(a => ({
            ...a,
            createdAt: (a.createdAt as any) instanceof Date ? (a.createdAt as any).toISOString() : String(a.createdAt),
            updatedAt: (a.updatedAt as any) instanceof Date ? (a.updatedAt as any).toISOString() : String(a.updatedAt)
        }));

        if (search) {
            const q = search.toLowerCase();
            articles = articles.filter(a => 
                a.title.toLowerCase().includes(q) || 
                a.content.toLowerCase().includes(q) ||
                a.category.toLowerCase().includes(q)
            );
        }
        return articles;
    }

    public static async getById(id: string): Promise<Article | null> {
        const res = await db.query('SELECT * FROM articles WHERE id = $1', [id]);
        const a = res.rows[0] as Article | undefined;
        if (!a) return null;

        return {
            ...a,
            createdAt: (a.createdAt as any) instanceof Date ? (a.createdAt as any).toISOString() : String(a.createdAt),
            updatedAt: (a.updatedAt as any) instanceof Date ? (a.updatedAt as any).toISOString() : String(a.updatedAt)
        };
    }

    public static async create(articleData: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>): Promise<Article> {
        const id = `KB-${Date.now()}`;
        const now = new Date();
        
        const maxOrderRes = await db.query('SELECT COALESCE(MAX("sortOrder"), -1) as "maxOrder" FROM articles');
        const maxOrder = maxOrderRes.rows[0].maxOrder;
        
        const article: Article = {
            ...articleData,
            id,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            sortOrder: maxOrder + 1
        };

        const insertParams = {
            ...article,
            createdAt: new Date(article.createdAt),
            updatedAt: new Date(article.updatedAt)
        };

        await db.query(`
            INSERT INTO articles (id, title, content, category, author, "createdAt", "updatedAt", "sortOrder")
            VALUES (@id, @title, @content, @category, @author, @createdAt, @updatedAt, @sortOrder)
        `, insertParams);

        return article;
    }

    public static async update(id: string, updateData: { title?: string; content?: string; category?: string }): Promise<Article | null> {
        const existing = await this.getById(id);
        if (!existing) return null;

        const allowed = ['title', 'content', 'category'];
        const setClauses: string[] = [];
        const values: Record<string, any> = {};

        for (const key of allowed) {
            const val = (updateData as any)[key];
            if (val !== undefined) {
                setClauses.push(`"${key}" = @${key}`);
                values[key] = val;
            }
        }

        if (setClauses.length === 0) {
            return this.getById(id);
        }

        setClauses.push('"updatedAt" = @updatedAt');
        values.updatedAt = new Date();
        values.id = id;

        await db.query(`UPDATE articles SET ${setClauses.join(', ')} WHERE id = @id`, values);
        return this.getById(id);
    }

    public static async delete(id: string): Promise<boolean> {
        const existingRes = await db.query('SELECT 1 FROM articles WHERE id = $1', [id]);
        if (existingRes.rowCount === 0) return false;

        await db.query('DELETE FROM articles WHERE id = $1', [id]);
        return true;
    }

    public static async reorder(order: string[]): Promise<void> {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            for (let index = 0; index < order.length; index++) {
                await client.query('UPDATE articles SET "sortOrder" = $1, "updatedAt" = $2 WHERE id = $3', [
                    index,
                    new Date(),
                    order[index]
                ]);
            }
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}
