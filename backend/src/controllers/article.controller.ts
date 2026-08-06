import { Request, Response, NextFunction } from 'express';
import { ArticleService } from '../services/article.service';

export class ArticleController {
    public static getAll(req: Request, res: Response, next: NextFunction): void {
        try {
            const { search } = req.query;
            const articles = ArticleService.getAll(search as string);
            res.json(articles);
        } catch (err) {
            next(err);
        }
    }

    public static getById(req: Request, res: Response, next: NextFunction): void {
        try {
            const article = ArticleService.getById(String(req.params.id));
            if (!article) {
                res.status(404).json({ error: 'Article not found' });
                return;
            }
            res.json(article);
        } catch (err) {
            next(err);
        }
    }

    public static create(req: Request, res: Response, next: NextFunction): void {
        try {
            const { title, content, category = 'General', author = 'Admin' } = req.body;

            // Input Validation
            if (!title || typeof title !== 'string' || !title.trim()) {
                res.status(400).json({ error: 'Missing or invalid required field: title' });
                return;
            }
            if (!content || typeof content !== 'string' || !content.trim()) {
                res.status(400).json({ error: 'Missing or invalid required field: content' });
                return;
            }

            const article = ArticleService.create({
                title: title.trim(),
                content: content.trim(),
                category,
                author
            });

            res.status(201).json(article);
        } catch (err) {
            next(err);
        }
    }

    public static update(req: Request, res: Response, next: NextFunction): void {
        try {
            const { title, content, category } = req.body;
            
            const article = ArticleService.update(String(req.params.id), {
                title,
                content,
                category
            });

            if (!article) {
                res.status(404).json({ error: 'Article not found' });
                return;
            }

            res.json(article);
        } catch (err) {
            next(err);
        }
    }

    public static delete(req: Request, res: Response, next: NextFunction): void {
        try {
            const success = ArticleService.delete(String(req.params.id));
            if (!success) {
                res.status(404).json({ error: 'Article not found' });
                return;
            }
            res.json({ success: true, id: String(req.params.id) });
        } catch (err) {
            next(err);
        }
    }

    public static reorder(req: Request, res: Response, next: NextFunction): void {
        try {
            const { order } = req.body;

            // Input Validation
            if (!order || !Array.isArray(order)) {
                res.status(400).json({ error: 'order must be an array of article IDs' });
                return;
            }

            ArticleService.reorder(order);
            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    }
}
