import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { TicketController } from '../controllers/ticket.controller';

const router = Router();

// Setup Multer for attachments
const storage = multer.diskStorage({
    destination: path.join(__dirname, '../../uploads'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Ticket routes
router.get('/', TicketController.getAll);
router.get('/:id', TicketController.getById);
router.post('/', TicketController.create);
router.put('/:id', TicketController.update);
router.delete('/:id', TicketController.delete);

// Note routes
router.post('/:id/notes', TicketController.addNote);

// Attachment upload route
router.post('/:id/attachments', upload.single('file'), TicketController.uploadAttachment);

export default router;
