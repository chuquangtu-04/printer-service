"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CONFIG_PATH = path_1.default.join(__dirname, '../storage/config/printers.json');
class PrinterConfig {
    aliasMap = {};
    constructor() {
        this.reload();
    }
    reload() {
        try {
            const raw = fs_1.default.readFileSync(CONFIG_PATH, 'utf-8');
            this.aliasMap = JSON.parse(raw);
        }
        catch {
            this.aliasMap = {};
        }
    }
    /** Trả về tên máy in thật trên hệ thống, ứng với alias logic (vd "cashier") */
    resolve(alias) {
        return this.aliasMap[alias] ?? null;
    }
    entries() {
        return Object.entries(this.aliasMap);
    }
}
exports.default = new PrinterConfig();
