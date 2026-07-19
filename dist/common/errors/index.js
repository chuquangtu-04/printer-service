"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateNotFoundError = exports.PrinterNotFoundError = exports.PrinterAliasNotFoundError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message) { super(message, 400); }
}
exports.ValidationError = ValidationError;
class PrinterAliasNotFoundError extends AppError {
    constructor(alias) { super(`Không tìm thấy cấu hình máy in cho alias: ${alias}`, 404); }
}
exports.PrinterAliasNotFoundError = PrinterAliasNotFoundError;
class PrinterNotFoundError extends AppError {
    constructor(name) { super(`Không tìm thấy máy in đang online: ${name}`, 404); }
}
exports.PrinterNotFoundError = PrinterNotFoundError;
class TemplateNotFoundError extends AppError {
    constructor(template) { super(`Không hỗ trợ template: ${template}`, 400); }
}
exports.TemplateNotFoundError = TemplateNotFoundError;
