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
class PrintService {
    manager = new PrinterManager_1.PrinterManager([new SpoolerDriver_1.SpoolerDriver()]);
    async print(req) {
        const { printer: alias, template, data } = req;
        // 1. Resolve alias -> tên máy in thật
        const realName = printerConfig_1.default.resolve(alias);
        if (!realName)
            throw new errors_1.PrinterAliasNotFoundError(alias);
        // 2. Builder: dựng nội dung theo template
        const buffer = BuilderFactory_1.BuilderFactory.build(template, data);
        // 3. PrinterManager: tìm máy in đang online + gửi qua Driver
        try {
            await this.manager.print(realName, buffer);
        }
        catch (err) {
            if (err.message?.startsWith('Không tìm thấy máy in')) {
                throw new errors_1.PrinterNotFoundError(realName);
            }
            throw err;
        }
        return { success: true, message: `Đã gửi lệnh in tới "${alias}" (${realName})` };
    }
}
exports.default = new PrintService();
