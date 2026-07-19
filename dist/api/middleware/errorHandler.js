"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../../common/errors");
function errorHandler(err, _req, res, _next) {
    if (err instanceof errors_1.AppError) {
        res.status(err.statusCode).json({ success: false, message: err.message });
        return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
}
