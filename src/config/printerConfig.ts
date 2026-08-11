import fs from 'fs';
import path from 'path';

interface PrinterAliasMap {
  [alias: string]: string;
}

const CONFIG_FILE = 'printers.json';

function buildConfigCandidates(): string[] {
  const candidates = [
    path.join(__dirname, '../storage/config', CONFIG_FILE),
    path.join(process.cwd(), 'dist/storage/config', CONFIG_FILE),
    path.join(process.cwd(), 'src/storage/config', CONFIG_FILE),
  ];

  const resourcesPath = (process as { resourcesPath?: string }).resourcesPath;
  if (resourcesPath) {
    candidates.unshift(path.join(resourcesPath, 'storage/config', CONFIG_FILE));
  }

  return candidates;
}

class PrinterConfig {
  private aliasMap: PrinterAliasMap = {};

  constructor() {
    this.reload();
  }

  reload(): void {
    for (const configPath of buildConfigCandidates()) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        this.aliasMap = JSON.parse(raw);
        return;
      } catch {
        // Try the next candidate path.
      }
    }

    this.aliasMap = {};
  }

  /** Trả về tên máy in thật trên hệ thống, ứng với alias logic (vd "cashier") */
  resolve(alias: string): string | null {
    return this.aliasMap[alias] ?? null;
  }

  entries(): Array<[string, string]> {
    return Object.entries(this.aliasMap);
  }
}

export default new PrinterConfig();
