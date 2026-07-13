import { Router } from 'express';
import { getPrinters, testPrint } from '../controllers/printerController';

const router = Router();
router.get('/printers', getPrinters);
router.post('/printers/test', testPrint);

export default router;
