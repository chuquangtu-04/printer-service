import { Router } from 'express';
import { checkHealth } from '../controllers/healthController';
import { getPrinters, testPrint, testPrintById } from '../controllers/printerController';
import { clearQueue, getQueue, retryQueue } from '../controllers/queueController';
import { print } from '../controllers/printController';

const router = Router();

// Health
router.get('/health', checkHealth);

// Printers
router.get('/printers', getPrinters);
router.post('/printers/test', testPrint);
router.post('/printers/:printerId/test', testPrintById);

// Print
router.post('/print', print);

// Queue
router.get('/queue', getQueue);
router.delete('/queue', clearQueue);
router.post('/queue/retry', retryQueue);

export default router;
