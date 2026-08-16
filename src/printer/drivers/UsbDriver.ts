import { execFile } from 'child_process';
import util from 'util';
import os from 'os';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

const execFileAsync = util.promisify(execFile);

const WINDOWS_EXIT_CODE_MESSAGE: Record<number, string> = {
  1: 'Sai tham so truyen vao printer.exe',
  2: 'Khong tim thay file du lieu in',
  3: 'Loi khi gui du lieu toi may in',
};

const WINDOWS_JOB_MONITOR_TIMEOUT_MS = positiveNumber(process.env.PRINTER_JOB_MONITOR_TIMEOUT_MS, 10000);
const WINDOWS_JOB_MONITOR_INTERVAL_MS = positiveNumber(process.env.PRINTER_JOB_MONITOR_INTERVAL_MS, 1000);

interface ExecFileError extends Error {
  code?: unknown;
  stderr?: unknown;
}

interface WriteOptions {
  progress?: (progress: { status: 'spooled'; spoolerJobId?: number }) => void;
}

interface WindowsPrintJob {
  Name?: string;
  JobId?: number;
  JobStatus?: string;
  Status?: string;
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
    this.printerExePath = this._getPrinterExePath();
  }

  private _getPrinterExePath(): string {
    const resourcesPath = (process as { resourcesPath?: string }).resourcesPath;
    if (resourcesPath) {
      const packagedPath = path.join(resourcesPath, 'bin', 'printer.exe');
      if (existsSync(packagedPath)) return packagedPath;
    }

    const devPath = path.join(__dirname, '../../../bin/printer.exe');
    if (existsSync(devPath)) return devPath;

    return path.join(process.cwd(), 'bin', 'printer.exe');
  }

  async write(printerName: string, data: Buffer, options: WriteOptions = {}): Promise<void> {
    switch (this.platform) {
      case 'win32':
        return this._writeWindows(printerName, data, options);
      case 'darwin':
      case 'linux':
        return this._writeUnix(printerName, data);
      default:
        throw new Error(`Khong ho tro nen tang: ${this.platform}`);
    }
  }

  private async _writeWindows(printerName: string, data: Buffer, options: WriteOptions): Promise<void> {
    await this._ensurePrinterExeExists();

    const tempFile = this._createTempRawPath();
    await fs.writeFile(tempFile, data);

    try {
      const { stdout } = await execFileAsync(this.printerExePath, [printerName, tempFile, 'Raw Print Job']);
      const spoolerJobId = this._parseSpoolerJobId(stdout);

      options.progress?.({ status: 'spooled', spoolerJobId });

      if (spoolerJobId !== undefined) {
        await this._waitForWindowsPrintJobToFinish(printerName, spoolerJobId);
      }
    } catch (err: unknown) {
      const execError = err as ExecFileError;
      const exitCode = typeof execError.code === 'number' ? execError.code : undefined;
      const reason = exitCode === undefined ? 'Khong xac dinh' : WINDOWS_EXIT_CODE_MESSAGE[exitCode] ?? 'Khong xac dinh';
      const stderr = String(execError.stderr ?? '').trim();

      if (exitCode === undefined) {
        throw err;
      }

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

  private _parseSpoolerJobId(stdout: string): number | undefined {
    const match = stdout.match(/JOB_ID=(\d+)/);
    if (!match) return undefined;

    const jobId = Number(match[1]);
    return Number.isInteger(jobId) && jobId > 0 ? jobId : undefined;
  }

  private async _waitForWindowsPrintJobToFinish(printerName: string, jobId: number): Promise<void> {
    const deadline = Date.now() + WINDOWS_JOB_MONITOR_TIMEOUT_MS;
    let lastJob: WindowsPrintJob | null = null;

    while (Date.now() <= deadline) {
      const job = await this._getWindowsPrintJob(printerName, jobId);
      if (!job) return;

      lastJob = job;
      if (this._isWindowsPrintJobFaulted(job)) {
        await this._removeWindowsPrintJob(printerName, jobId);
        throw new Error(`Windows print job loi: ${this._formatWindowsPrintJob(job)}`);
      }

      await this._sleep(WINDOWS_JOB_MONITOR_INTERVAL_MS);
    }

    await this._removeWindowsPrintJob(printerName, jobId);
    throw new Error(`Windows print job van con trong spooler sau ${WINDOWS_JOB_MONITOR_TIMEOUT_MS}ms: ${this._formatWindowsPrintJob(lastJob)}`);
  }

  private async _getWindowsPrintJob(printerName: string, jobId: number): Promise<WindowsPrintJob | null> {
    const printerNameLiteral = this._powershellString(printerName);
    const script = [
      `$PrinterName = ${printerNameLiteral}`,
      `$JobId = ${jobId}`,
      '$job = Get-CimInstance -ClassName Win32_PrintJob -ErrorAction Stop | Where-Object { $_.JobId -eq $JobId -and $_.Name -like "$PrinterName,*" } | Select-Object -First 1 Name,JobId,JobStatus,Status',
      'if ($null -ne $job) { $job | ConvertTo-Json -Compress }',
    ].join('; ');

    const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', script]);
    const content = stdout.trim();
    if (!content) return null;

    return JSON.parse(content) as WindowsPrintJob;
  }

  private _powershellString(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
  }

  private async _removeWindowsPrintJob(printerName: string, jobId: number): Promise<void> {
    const printerNameLiteral = this._powershellString(printerName);
    const script = [
      `$PrinterName = ${printerNameLiteral}`,
      `$JobId = ${jobId}`,
      '$job = Get-CimInstance -ClassName Win32_PrintJob -ErrorAction SilentlyContinue | Where-Object { $_.JobId -eq $JobId -and $_.Name -like "$PrinterName,*" } | Select-Object -First 1',
      'if ($null -ne $job) { $job | Remove-CimInstance -ErrorAction SilentlyContinue }',
    ].join('; ');

    await execFileAsync('powershell', ['-NoProfile', '-Command', script]).catch(() => undefined);
  }

  private _isWindowsPrintJobFaulted(job: WindowsPrintJob): boolean {
    const status = `${job.JobStatus ?? ''} ${job.Status ?? ''}`.toLowerCase();
    return [
      'error',
      'offline',
      'paper out',
      'paperout',
      'blocked',
      'user intervention',
      'intervention',
    ].some((token) => status.includes(token));
  }

  private _formatWindowsPrintJob(job: WindowsPrintJob | null): string {
    if (!job) return `jobId unknown`;

    const parts = [
      `jobId=${job.JobId ?? 'unknown'}`,
      `name=${job.Name ?? 'unknown'}`,
      `status=${job.Status ?? 'unknown'}`,
      `jobStatus=${job.JobStatus ?? 'unknown'}`,
    ];

    return parts.join(', ');
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async _ensurePrinterExeExists(): Promise<void> {
    try {
      await fs.access(this.printerExePath);
    } catch {
      throw new Error(`Khong tim thay printer.exe tai ${this.printerExePath}. Hay chay "npm run build:printer" truoc khi in tren Windows.`);
    }
  }
}
