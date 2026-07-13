import fs from 'fs';
import path from 'path';

interface PrinterAliasMap {
  [alias: string]: string;
}

const CONFIG_PATH = path.join(__dirname, '../storage/config/printers.json');

class PrinterConfig {
  private aliasMap: PrinterAliasMap = {};

  constructor() {
    this.reload();
  }

  reload(): void {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      this.aliasMap = JSON.parse(raw);
    } catch {
      this.aliasMap = {};
    }
  }

  /** Trả về tên máy in thật trên hệ thống, ứng với alias logic (vd "cashier") */
  resolve(alias: string): string | null {
    return this.aliasMap[alias] ?? null;
  }
}

export default new PrinterConfig();
