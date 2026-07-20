"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthController_1 = require("../controllers/healthController");
const printerController_1 = require("../controllers/printerController");
const queueController_1 = require("../controllers/queueController");
const printController_1 = require("../controllers/printController");
const router = (0, express_1.Router)();
// Health
router.get('/health', healthController_1.checkHealth);
// Printers
router.get('/printers', printerController_1.getPrinters);
router.get('/printers/status', printerController_1.getPrinterStatuses);
router.post('/printers/test', printerController_1.testPrint);
// Print
router.post('/print', printController_1.print);
// Queue
router.get('/queue', queueController_1.getQueue);
router.delete('/queue', queueController_1.clearQueue);
router.post('/queue/retry', queueController_1.retryQueue);
exports.default = router;
