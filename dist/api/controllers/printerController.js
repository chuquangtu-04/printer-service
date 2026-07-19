"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPrint = exports.getPrinters = void 0;
const printerService_1 = require("@/printer/services/printerService");
const getPrinters = async (req, res, next) => {
    try {
        const printers = await printerService_1.printerService.listPrinters();
        res.json(printers);
    }
    catch (err) {
        next(err);
    }
};
exports.getPrinters = getPrinters;
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
        if (err.message?.startsWith('Không tìm thấy máy in')) {
            res.status(404).json({ success: false, message: err.message });
            return;
        }
        next(err);
    }
};
exports.testPrint = testPrint;
