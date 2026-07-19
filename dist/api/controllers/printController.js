"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.print = print;
const PrintService_1 = __importDefault(require("../../printer/services/PrintService"));
const errors_1 = require("../../common/errors");
async function print(req, res, next) {
    try {
        const { printer, template, data } = req.body ?? {};
        if (!printer || typeof printer !== 'string') {
            throw new errors_1.ValidationError('Thiếu hoặc sai kiểu field "printer"');
        }
        if (!template || typeof template !== 'string') {
            throw new errors_1.ValidationError('Thiếu hoặc sai kiểu field "template"');
        }
        if (data === undefined || typeof data !== 'object') {
            throw new errors_1.ValidationError('Thiếu hoặc sai kiểu field "data"');
        }
        const result = await PrintService_1.default.print({ printer, template, data });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
}
