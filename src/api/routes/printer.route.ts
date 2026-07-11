import { Router } from 'express';
import { getPrinters, testPrint } from '../controllers/printer.controller';

const router = Router();
router.get('/printers', getPrinters);
router.post('/printers/test', testPrint);

export default router;
