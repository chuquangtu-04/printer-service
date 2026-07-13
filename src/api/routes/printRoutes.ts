import { Router } from 'express';
import { print } from '../controllers/printController';

const router = Router();
router.post('/print', print);

export default router;
