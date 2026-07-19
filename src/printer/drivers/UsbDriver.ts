import { execFile } from 'child_process';
import util from 'util';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

const execFileAsync = util.promisify(execFile);

const WINDOWS_EXIT_CODE_MESSAGE: Record<number, string> = {
  1: 'Sai tham so truyen vao printer.exe',
  2: 'Khong tim thay file du lieu in',
  3: 'Loi khi gui du lieu toi may in',
};

interface ExecFileError extends Error {
  code?: unknown;
  stderr?: unknown;
}

/**
 * UsbDriver sends raw ESC/POS bytes to the target printer.
 * On Windows it delegates raw spooler writes to bin/printer.exe.
 */
export class UsbDriver {
  platform: NodeJS.Platform;
  private printerExePath: string;

  constructor() {
    this.platform = os.platform();
    this.printerExePath = path.join(__dirname, '../../../bin/printer.exe');
  }

  async write(printerName: string, data: Buffer): Promise<void> {
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

  private async _writeWindows(printerName: string, data: Buffer): Promise<void> {
    await this._ensurePrinterExeExists();

    const tempFile = this._createTempRawPath();
    await fs.writeFile(tempFile, data);

    try {
      await execFileAsync(this.printerExePath, [printerName, tempFile, 'Raw Print Job']);
    } catch (err: unknown) {
      const execError = err as ExecFileError;
      const exitCode = typeof execError.code === 'number' ? execError.code : undefined;
      const reason = exitCode === undefined ? 'Khong xac dinh' : WINDOWS_EXIT_CODE_MESSAGE[exitCode] ?? 'Khong xac dinh';
      const stderr = String(execError.stderr ?? '').trim();

      throw new Error(
        `In that bai qua printer.exe${exitCode === undefined ? '' : ` (exit ${exitCode})`}: ${reason}${stderr ? ` - ${stderr}` : ''}`
      );
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  private async _writeUnix(printerName: string, data: Buffer): Promise<void> {
    const tempFile = this._createTempRawPath();
    await fs.writeFile(tempFile, data);

    try {
      await execFileAsync('lp', ['-d', printerName, '-o', 'raw', tempFile]);
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  private _createTempRawPath(): string {
    return path.join(tmpdir(), `print_${process.pid}_${Date.now()}_${Math.random().toString(16).slice(2)}.raw`);
  }

  private async _ensurePrinterExeExists(): Promise<void> {
    try {
      await fs.access(this.printerExePath);
    } catch {
      throw new Error(`Khong tim thay printer.exe tai ${this.printerExePath}. Hay chay "npm run build:printer" truoc khi in tren Windows.`);
    }
  }
}
