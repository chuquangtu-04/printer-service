"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printerService = void 0;
const PrinterManager_1 = require("../manager/PrinterManager");
const SpoolerDriver_1 = require("../drivers/SpoolerDriver");
const TestBuilder_1 = require("../builders/TestBuilder");
const printerConfig_1 = __importDefault(require("../../config/printerConfig"));
class PrinterService {
    manager;
    constructor() {
        this.manager = new PrinterManager_1.PrinterManager([new SpoolerDriver_1.SpoolerDriver()]);
    }
    async listPrinters() {
        const printers = await this.manager.discoverAll();
        return printers.map((p) => p.toJSON());
    }
    async getPrinterStatuses() {
        const configuredPrinters = printerConfig_1.default.entries().map(([alias, printerName]) => ({
            id: alias,
            printerName,
        }));
        return this.manager.status(configuredPrinters);
    }
    async testPrint(printerId) {
        const content = new TestBuilder_1.TestBuilder().build(undefined);
        const target = await this.manager.print(printerId, content);
        return {
            success: true,
            message: `Đã gửi lệnh test print tới ${target.name}`,
        };
    }
}
exports.printerService = new PrinterService();
