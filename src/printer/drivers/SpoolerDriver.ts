import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import crypto from 'crypto';
import { Printer } from '../models/Printer';
import type { PrinterStatus } from '../manager/PrinterManager';

const execAsync = util.promisify(exec);

interface WindowsPrinterInfo {
  Name: string;
  PortName?: string;
  Default?: boolean;
  WorkOffline?: boolean;
  PrinterStatus?: number;
  DetectedErrorState?: number;
  ExtendedPrinterStatus?: number;
}

export class SpoolerDriver {
  platform: NodeJS.Platform;

  constructor() {
    this.platform = os.platform(); // 'win32' | 'darwin' | 'linux'
  }

  async discover(): Promise<Printer[]> {
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

  async status(): Promise<PrinterStatus[]> {
    const printers = await this.discover();
    return printers.map((printer) => ({
      id: printer.name,
      status: printer.status,
    }));
  }

  async _discoverWindows(): Promise<Printer[]> {
    try {
      const { stdout } = await execAsync(
        'powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_Printer | ' +
        'Select-Object Name,PortName,Default,WorkOffline,PrinterStatus,DetectedErrorState,ExtendedPrinterStatus | ConvertTo-Json"'
      );

      let raw = JSON.parse(stdout || '[]') as WindowsPrinterInfo | WindowsPrinterInfo[];
      if (!Array.isArray(raw)) raw = [raw]; // PS trả object đơn nếu chỉ có 1 máy in

      return raw.map((p) => new Printer({
        id: this._buildId(p.Name, p.PortName ?? ''),
        name: p.Name,
        type: this._classifyPort(p.PortName),
        status: this._classifyWindowsStatus(p),
        isDefault: !!p.Default,
        port: p.PortName ?? null,
        meta: {
          workOffline: !!p.WorkOffline,
          printerStatus: p.PrinterStatus,
          detectedErrorState: p.DetectedErrorState,
          extendedPrinterStatus: p.ExtendedPrinterStatus,
        },
      }));
    } catch {
      return [];
    }
  }

  async _discoverUnix(): Promise<Printer[]> {
    try {
      const [{ stdout: pOut }, { stdout: dOut }, { stdout: vOut }] = await Promise.all([
        execAsync('lpstat -p').catch(() => ({ stdout: '' })),
        execAsync('lpstat -d').catch(() => ({ stdout: '' })),
        execAsync('lpstat -v').catch(() => ({ stdout: '' })),
      ]);

      const defaultName = this._parseDefault(dOut);
      const statusMap = this._parseStatuses(pOut);
      const deviceMap = this._parseDevices(vOut);

      return Object.entries(deviceMap).map(([name, uri]) => new Printer({
        id: this._buildId(name, uri),
        name,
        type: this._classifyPort(uri),
        status: statusMap[name] || 'unknown',
        isDefault: name === defaultName,
        port: uri,
      }));
    } catch {
      return [];
    }
  }

  _classifyPort(portOrUri: string = ''): string {
    const p = portOrUri.toUpperCase();
    if (p.startsWith('USB')) return 'USB';
    if (
      p.startsWith('IP_') || p.startsWith('IPP://') ||
      p.startsWith('IPPS://') || p.startsWith('SOCKET://') ||
      p.startsWith('LPD://') || p.startsWith('DNSSD://') ||
      /^\d{1,3}(\.\d{1,3}){3}/.test(p)
    ) return 'NETWORK';
    return 'UNKNOWN';
  }

  _classifyWindowsStatus(printer: WindowsPrinterInfo): string {
    if (printer.WorkOffline) return 'offline';

    if (printer.PrinterStatus === 7) return 'offline';
    if (printer.PrinterStatus === 6) return 'error';

    const detectedErrorState = printer.DetectedErrorState;
    if (detectedErrorState !== undefined && detectedErrorState !== null && ![0, 2].includes(detectedErrorState)) {
      return detectedErrorState === 9 ? 'offline' : 'error';
    }

    const extendedPrinterStatus = printer.ExtendedPrinterStatus;
    if (
      extendedPrinterStatus !== undefined &&
      extendedPrinterStatus !== null &&
      ![0, 2, 3, 4, 5].includes(extendedPrinterStatus)
    ) {
      return extendedPrinterStatus === 7 ? 'offline' : 'error';
    }

    return 'online';
  }

  _parseDefault(dOut: string): string | null {
    const m = dOut.match(/system default destination:\s*(\S+)/);
    return m ? m[1] : null;
  }

  _parseStatuses(pOut: string): Record<string, string> {
    const map: Record<string, string> = {};
    pOut.split('\n').forEach((line) => {
      const m = line.match(/^printer\s+(\S+)\s+is\s+(\w+)/);
      if (m) map[m[1]] = ['idle', 'printing'].includes(m[2]) ? 'online' : 'offline';
    });
    return map;
  }

  _parseDevices(vOut: string): Record<string, string> {
    const map: Record<string, string> = {};
    vOut.split('\n').forEach((line) => {
      const m = line.match(/^device for\s+(\S+):\s*(\S+)/);
      if (m) map[m[1]] = m[2];
    });
    return map;
  }

  _buildId(name: string, discriminator: string): string {
    const hash = crypto.createHash('md5').update(`printer:${name}:${discriminator}`).digest('hex').slice(0, 12);
    return `prn_${hash}`;
  }
}
