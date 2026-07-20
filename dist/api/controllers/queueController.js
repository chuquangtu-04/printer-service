"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryQueue = exports.clearQueue = exports.getQueue = void 0;
const PrintService_1 = __importDefault(require("../../printer/services/PrintService"));
const errors_1 = require("../../common/errors");
const getQueue = (_req, res, next) => {
    try {
        res.json(PrintService_1.default.listQueue());
    }
    catch (err) {
        next(err);
    }
};
exports.getQueue = getQueue;
const clearQueue = (_req, res, next) => {
    try {
        res.json(PrintService_1.default.clearQueue());
    }
    catch (err) {
        next(err);
    }
};
exports.clearQueue = clearQueue;
const retryQueue = (req, res, next) => {
    try {
        const rawId = req.body?.id ?? req.body?.jobId;
        const jobId = rawId === undefined ? undefined : Number(rawId);
        if (jobId !== undefined && (!Number.isInteger(jobId) || jobId <= 0)) {
            throw new errors_1.ValidationError('Field "id" phai la so nguyen duong');
        }
        const jobs = PrintService_1.default.retryQueue(jobId);
        res.json({
            success: true,
            retried: jobs.length,
            jobs,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.retryQueue = retryQueue;
