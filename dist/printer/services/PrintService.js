"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PrinterManager_1 = require("../manager/PrinterManager");
const SpoolerDriver_1 = require("../drivers/SpoolerDriver");
const BuilderFactory_1 = require("../builders/BuilderFactory");
const printerConfig_1 = __importDefault(require("../../config/printerConfig"));
const errors_1 = require("../../common/errors");
const QueueManager_1 = require("../queue/QueueManager");
const QueueRepository_1 = require("../queue/QueueRepository");
const RetryPolicy_1 = require("../queue/RetryPolicy");
class PrintService {
    manager = new PrinterManager_1.PrinterManager([new SpoolerDriver_1.SpoolerDriver()]);
    queueManager = new QueueManager_1.QueueManager(new QueueRepository_1.QueueRepository(), new RetryPolicy_1.RetryPolicy(), async (job) => {
        await this.manager.print(job.printerName, job.buffer);
    });
    async print(req) {
        const { printer: alias, template, data } = req;
        const realName = printerConfig_1.default.resolve(alias);
        if (!realName)
            throw new errors_1.PrinterAliasNotFoundError(alias);
        const buffer = BuilderFactory_1.BuilderFactory.build(template, data);
        const job = this.queueManager.add({
            queueKey: alias,
            printer: alias,
            printerName: realName,
            template,
            buffer,
        });
        return { success: true, message: `Da them lenh in vao queue "${alias}" (${realName})`, job };
    }
    listQueue() {
        return this.queueManager.list();
    }
    clearQueue() {
        return this.queueManager.clear();
    }
    retryQueue(jobId) {
        return this.queueManager.retry(jobId);
    }
}
exports.default = new PrintService();
