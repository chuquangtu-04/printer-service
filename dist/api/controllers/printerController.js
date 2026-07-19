"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPrint = exports.getPrinterStatuses = exports.getPrinters = void 0;
const printerService_1 = require("@/printer/services/printerService");
const isPrinterNotFoundError = (err) => {
    if (!(err instanceof Error))
        return false;
    return err.message.startsWith('Không tìm thấy máy in') || err.message.startsWith('KhÃ´ng tÃ¬m tháº¥y mÃ¡y in');
};
const getPrinters = async (_req, res, next) => {
    try {
        const printers = await printerService_1.printerService.listPrinters();
        res.json(printers);
    }
    catch (err) {
        next(err);
    }
};
exports.getPrinters = getPrinters;
const getPrinterStatuses = async (_req, res, next) => {
    try {
        const statuses = await printerService_1.printerService.getPrinterStatuses();
        res.json(statuses);
    }
    catch (err) {
        next(err);
    }
};
exports.getPrinterStatuses = getPrinterStatuses;
const testPrint = async (req, res, next) => {
    try {
        const { printerId } = req.body;
        if (!printerId) {
            res.status(400).json({ success: false, message: 'Thiếu printerId' });
            return;
        }
        const result = await printerService_1.printerService.testPrint(printerId);
        res.json(result);
    }
    catch (err) {
        if (isPrinterNotFoundError(err)) {
            res.status(404).json({ success: false, message: err.message });
            return;
        }
        next(err);
    }
};
exports.testPrint = testPrint;
