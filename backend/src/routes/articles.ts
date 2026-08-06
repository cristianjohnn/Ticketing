import { Router } from 'express';
import { ArticleController } from '../controllers/article.controller';

const router = Router();

router.get('/', ArticleController.getAll);
router.get('/:id', ArticleController.getById);
router.post('/', ArticleController.create);
router.put('/reorder', ArticleController.reorder); // Reorder must be before :id
router.put('/:id', ArticleController.update);
router.delete('/:id', ArticleController.delete);

export default router;
