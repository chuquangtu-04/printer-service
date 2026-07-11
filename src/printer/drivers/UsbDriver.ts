import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

const execAsync = util.promisify(exec);

/**
 * UsbDriver gửi RAW bytes trực tiếp tới máy in — bỏ qua tầng xử lý
 * văn bản/đồ họa của spooler. Bắt buộc với máy in nhiệt ESC/POS.
 * Khác với SpoolerDriver (chỉ đọc danh sách), driver này GHI dữ liệu.
 */
export class UsbDriver {
  platform: NodeJS.Platform;

  constructor() {
    this.platform = os.platform();
  }

  async write(printerName: string, data: Buffer): Promise<void> {
    switch (this.platform) {
      case 'win32':
        return this._writeWindows(printerName, data);
      case 'darwin':
      case 'linux':
        return this._writeUnix(printerName, data);
      default:
        throw new Error(`Không hỗ trợ nền tảng: ${this.platform}`);
    }
  }

  private async _writeUnix(printerName: string, data: Buffer): Promise<void> {
    const tempFile = path.join(tmpdir(), `print_${Date.now()}.raw`);
    await fs.writeFile(tempFile, data);

    try {
      // -o raw: bắt CUPS gửi thẳng byte, không filter/định dạng lại
      await execAsync(`lp -d "${this._escape(printerName)}" -o raw "${tempFile}"`);
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  private async _writeWindows(printerName: string, data: Buffer): Promise<void> {
    const tempFile = path.join(tmpdir(), `print_${Date.now()}.raw`);
    const scriptFile = path.join(tmpdir(), `rawprint_${Date.now()}.ps1`);
    await fs.writeFile(tempFile, data);

    // Windows không có lệnh CLI raw-print built-in đáng tin cậy,
    // nên gọi thẳng Win32 API WritePrinter qua PowerShell P/Invoke.
    const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
public struct DOC_INFO_1 {
  [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
  [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
  [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
}

public class RawPrinter {
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOC_INFO_1 di);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] buf, int count, out int written);
}
"@

$bytes = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")
$hPrinter = [IntPtr]::Zero
[RawPrinter]::OpenPrinter("${this._escapePs(printerName)}", [ref]$hPrinter, [IntPtr]::Zero) | Out-Null
if ($hPrinter -eq [IntPtr]::Zero) { throw "Khong mo duoc printer: ${this._escapePs(printerName)}" }

$docInfo = New-Object DOC_INFO_1
$docInfo.pDocName = "Test Print"

[RawPrinter]::StartDocPrinter($hPrinter, 1, [ref]$docInfo) | Out-Null
[RawPrinter]::StartPagePrinter($hPrinter) | Out-Null
$written = 0
[RawPrinter]::WritePrinter($hPrinter, $bytes, $bytes.Length, [ref]$written) | Out-Null
[RawPrinter]::EndPagePrinter($hPrinter) | Out-Null
[RawPrinter]::EndDocPrinter($hPrinter) | Out-Null
[RawPrinter]::ClosePrinter($hPrinter) | Out-Null
`.trim();

    await fs.writeFile(scriptFile, psScript, 'utf-8');

    try {
      await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptFile}"`);
    } finally {
      await fs.unlink(tempFile).catch(() => {});
      await fs.unlink(scriptFile).catch(() => {});
    }
  }

  private _escape(value: string): string {
    return value.replace(/"/g, '\\"');
  }

  private _escapePs(value: string): string {
    return value.replace(/"/g, '\`"');
  }
}
