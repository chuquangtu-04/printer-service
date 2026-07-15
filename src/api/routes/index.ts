import { Router } from 'express';
import { checkHealth } from '../controllers/healthController';
import { getPrinters, testPrint } from '../controllers/printerController';
import { print } from '../controllers/printController';

const router = Router();

// Health
router.get('/health', checkHealth);

// Printers
router.get('/printers', getPrinters);
router.post('/printers/test', testPrint);

// Print
router.post('/print', print);

export default router;
