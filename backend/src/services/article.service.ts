import { db } from '../config/db';
import { Article } from '../types';

const stmts = {
    getAllArticles: db.prepare(`SELECT * FROM articles ORDER BY sortOrder ASC, updatedAt DESC`),
    getArticleById: db.prepare(`SELECT * FROM articles WHERE id = ?`),
    getMaxSortOrder: db.prepare(`SELECT COALESCE(MAX(sortOrder), -1) as maxOrder FROM articles`),
    insertArticle: db.prepare(`
        INSERT INTO articles (id, title, content, category, author, createdAt, updatedAt, sortOrder)
        VALUES (@id, @title, @content, @category, @author, @createdAt, @updatedAt, @sortOrder)
    `),
    deleteArticle: db.prepare(`DELETE FROM articles WHERE id = ?`),
    updateSort: db.prepare('UPDATE articles SET sortOrder = ? WHERE id = ?')
};

export class ArticleService {
    public static getAll(search?: string): Article[] {
        let articles = stmts.getAllArticles.all() as Article[];
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

    public static getById(id: string): Article | null {
        const article = stmts.getArticleById.get(id) as Article | undefined;
        return article || null;
    }

    public static create(articleData: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>): Article {
        const id = `KB-${Date.now()}`;
        const now = new Date().toISOString();
        const { maxOrder } = stmts.getMaxSortOrder.get() as { maxOrder: number };
        
        const article: Article = {
            ...articleData,
            id,
            createdAt: now,
            updatedAt: now,
            sortOrder: maxOrder + 1
        };

        stmts.insertArticle.run(article);
        return article;
    }

    public static update(id: string, updateData: { title?: string; content?: string; category?: string }): Article | null {
        const existing = stmts.getArticleById.get(id);
        if (!existing) return null;

        const allowed = ['title', 'content', 'category'];
        const setClauses: string[] = [];
        const values: Record<string, any> = {};

        for (const key of allowed) {
            const val = (updateData as any)[key];
            if (val !== undefined) {
                setClauses.push(`${key} = @${key}`);
                values[key] = val;
            }
        }

        if (setClauses.length === 0) {
            return this.getById(id);
        }

        setClauses.push('updatedAt = @updatedAt');
        values.updatedAt = new Date().toISOString();
        values.id = id;

        db.prepare(`UPDATE articles SET ${setClauses.join(', ')} WHERE id = @id`).run(values);
        return this.getById(id);
    }

    public static delete(id: string): boolean {
        const existing = stmts.getArticleById.get(id);
        if (!existing) return false;

        stmts.deleteArticle.run(id);
        return true;
    }

    public static reorder(order: string[]): void {
        const reorderAll = db.transaction((ids: string[]) => {
            ids.forEach((id, index) => stmts.updateSort.run(index, id));
        });
        reorderAll(order);
    }
}
