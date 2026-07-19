"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsbDriver = void 0;
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const os_1 = __importDefault(require("os"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const os_2 = require("os");
const execFileAsync = util_1.default.promisify(child_process_1.execFile);
const WINDOWS_EXIT_CODE_MESSAGE = {
    1: 'Sai tham so truyen vao printer.exe',
    2: 'Khong tim thay file du lieu in',
    3: 'Loi khi gui du lieu toi may in',
};
/**
 * UsbDriver sends raw ESC/POS bytes to the target printer.
 * On Windows it delegates raw spooler writes to bin/printer.exe.
 */
class UsbDriver {
    platform;
    printerExePath;
    constructor() {
        this.platform = os_1.default.platform();
        this.printerExePath = path_1.default.join(__dirname, '../../../bin/printer.exe');
    }
    async write(printerName, data) {
        switch (this.platform) {
            case 'win32':
                return this._writeWindows(printerName, data);
            case 'darwin':
            case 'linux':
                return this._writeUnix(printerName, data);
            default:
                throw new Error(`Khong ho tro nen tang: ${this.platform}`);
        }
    }
    async _writeWindows(printerName, data) {
        await this._ensurePrinterExeExists();
        const tempFile = this._createTempRawPath();
        await promises_1.default.writeFile(tempFile, data);
        try {
            await execFileAsync(this.printerExePath, [printerName, tempFile, 'Raw Print Job']);
        }
        catch (err) {
            const exitCode = typeof err.code === 'number' ? err.code : undefined;
            const reason = exitCode === undefined ? 'Khong xac dinh' : WINDOWS_EXIT_CODE_MESSAGE[exitCode] ?? 'Khong xac dinh';
            const stderr = String(err.stderr ?? '').trim();
            throw new Error(`In that bai qua printer.exe${exitCode === undefined ? '' : ` (exit ${exitCode})`}: ${reason}${stderr ? ` - ${stderr}` : ''}`);
        }
        finally {
            await promises_1.default.unlink(tempFile).catch(() => { });
        }
    }
    async _writeUnix(printerName, data) {
        const tempFile = this._createTempRawPath();
        await promises_1.default.writeFile(tempFile, data);
        try {
            await execFileAsync('lp', ['-d', printerName, '-o', 'raw', tempFile]);
        }
        finally {
            await promises_1.default.unlink(tempFile).catch(() => { });
        }
    }
    _createTempRawPath() {
        return path_1.default.join((0, os_2.tmpdir)(), `print_${process.pid}_${Date.now()}_${Math.random().toString(16).slice(2)}.raw`);
    }
    async _ensurePrinterExeExists() {
        try {
            await promises_1.default.access(this.printerExePath);
        }
        catch {
            throw new Error(`Khong tim thay printer.exe tai ${this.printerExePath}. Hay chay "npm run build:printer" truoc khi in tren Windows.`);
        }
    }
}
exports.UsbDriver = UsbDriver;
