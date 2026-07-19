"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpoolerDriver = void 0;
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const os_1 = __importDefault(require("os"));
const crypto_1 = __importDefault(require("crypto"));
const Printer_1 = require("../models/Printer");
const execAsync = util_1.default.promisify(child_process_1.exec);
class SpoolerDriver {
    platform;
    constructor() {
        this.platform = os_1.default.platform(); // 'win32' | 'darwin' | 'linux'
    }
    async discover() {
        switch (this.platform) {
            case 'win32':
                return this._discoverWindows();
            case 'darwin':
            case 'linux':
                return this._discoverUnix();
            default:
                return [];
        }
    }
    async status() {
        const printers = await this.discover();
        return printers.map((printer) => ({
            id: printer.name,
            status: printer.status,
        }));
    }
    async _discoverWindows() {
        try {
            const { stdout } = await execAsync('powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_Printer | ' +
                'Select-Object Name,PortName,Default,WorkOffline | ConvertTo-Json"');
            let raw = JSON.parse(stdout || '[]');
            if (!Array.isArray(raw))
                raw = [raw]; // PS trả object đơn nếu chỉ có 1 máy in
            return raw.map((p) => new Printer_1.Printer({
                id: this._buildId(p.Name, p.PortName ?? ''),
                name: p.Name,
                type: this._classifyPort(p.PortName),
                status: p.WorkOffline ? 'offline' : 'online',
                isDefault: !!p.Default,
                port: p.PortName ?? null,
            }));
        }
        catch {
            return [];
        }
    }
    async _discoverUnix() {
        try {
            const [{ stdout: pOut }, { stdout: dOut }, { stdout: vOut }] = await Promise.all([
                execAsync('lpstat -p').catch(() => ({ stdout: '' })),
                execAsync('lpstat -d').catch(() => ({ stdout: '' })),
                execAsync('lpstat -v').catch(() => ({ stdout: '' })),
            ]);
            const defaultName = this._parseDefault(dOut);
            const statusMap = this._parseStatuses(pOut);
            const deviceMap = this._parseDevices(vOut);
            return Object.entries(deviceMap).map(([name, uri]) => new Printer_1.Printer({
                id: this._buildId(name, uri),
                name,
                type: this._classifyPort(uri),
                status: statusMap[name] || 'unknown',
                isDefault: name === defaultName,
                port: uri,
            }));
        }
        catch {
            return [];
        }
    }
    _classifyPort(portOrUri = '') {
        const p = portOrUri.toUpperCase();
        if (p.startsWith('USB'))
            return 'USB';
        if (p.startsWith('IP_') || p.startsWith('IPP://') ||
            p.startsWith('IPPS://') || p.startsWith('SOCKET://') ||
            p.startsWith('LPD://') || p.startsWith('DNSSD://') ||
            /^\d{1,3}(\.\d{1,3}){3}/.test(p))
            return 'NETWORK';
        return 'UNKNOWN';
    }
    _parseDefault(dOut) {
        const m = dOut.match(/system default destination:\s*(\S+)/);
        return m ? m[1] : null;
    }
    _parseStatuses(pOut) {
        const map = {};
        pOut.split('\n').forEach((line) => {
            const m = line.match(/^printer\s+(\S+)\s+is\s+(\w+)/);
            if (m)
                map[m[1]] = ['idle', 'printing'].includes(m[2]) ? 'online' : 'offline';
        });
        return map;
    }
    _parseDevices(vOut) {
        const map = {};
        vOut.split('\n').forEach((line) => {
            const m = line.match(/^device for\s+(\S+):\s*(\S+)/);
            if (m)
                map[m[1]] = m[2];
        });
        return map;
    }
    _buildId(name, discriminator) {
        const hash = crypto_1.default.createHash('md5').update(`printer:${name}:${discriminator}`).digest('hex').slice(0, 12);
        return `prn_${hash}`;
    }
}
exports.SpoolerDriver = SpoolerDriver;
