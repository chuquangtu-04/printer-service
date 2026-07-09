import { Router } from 'express';
import { getPrinters } from '../controllers/printer.controller';

const router = Router();
router.get('/printers', getPrinters);

export default router;
