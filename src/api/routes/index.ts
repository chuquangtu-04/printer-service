import { Router } from 'express';
import { checkHealth } from '../controllers/healthController';
import {
  deleteLanPrinter,
  discoverLanPrinters,
  getPrinters,
  saveLanPrinter,
  testLanPrinter,
  testPrint,
  updatePrinterCategories,
  updateLanPrinterName,
} from '../controllers/printerController';
import { clearQueue, getFailedQueue, getQueue, retryQueue } from '../controllers/queueController';
import { print } from '../controllers/printController';

const router = Router();

// Health
router.get('/health', checkHealth);

// Printers
router.get('/printers/lan/discover', discoverLanPrinters);
router.get('/printers', getPrinters);
router.post('/printers/lan/test', testLanPrinter);
router.post('/printers/lan/save', saveLanPrinter);
router.patch('/printers/:id/categories', updatePrinterCategories);
router.patch('/printers/lan/:id', updateLanPrinterName);
router.delete('/printers/lan/:id', deleteLanPrinter);

// Print
router.post('/print', print);
router.post('/printers/test', testPrint);

// Queue
router.get('/queue', getQueue);
router.get('/queue/failed', getFailedQueue);
router.delete('/queue', clearQueue);
router.post('/queue/retry', retryQueue);

export default router;
