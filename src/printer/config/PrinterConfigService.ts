import fs from 'fs';
import path from 'path';

export type PrinterConnection =
  | {
      type: 'tcp';
      host: string;
      port?: number;
    }
  | {
      type: 'usb';
      printerName: string;
    };

export interface ConfiguredPrinter {
  id: string;
  name: string;
  enabled: boolean;
  connection: PrinterConnection;
}

interface PrinterConfigFile {
  printers?: unknown;
}

interface LegacyConfiguredPrinter {
  id?: unknown;
  printer_id?: unknown;
  name?: unknown;
  type?: unknown;
  host?: unknown;
  port?: unknown;
  enabled?: unknown;
  connection?: unknown;
}

const CONFIG_DIR_NAME = 'TpposPrint';
const LEGACY_CONFIG_DIR_NAME = 'NemoPrinter';
const CONFIG_FILE_NAME = 'printers.json';
const DEFAULT_CONFIG: PrinterConfigFile = {
  printers: [],
};

export class PrinterConfigService {
  constructor(private readonly configPath = PrinterConfigService.resolveConfigPath()) {}

  listPrinters(): ConfiguredPrinter[] {
    if (!fs.existsSync(this.configPath)) return [];

    const content = fs.readFileSync(this.configPath, 'utf-8');
    const config = JSON.parse(content) as PrinterConfigFile;
    if (!Array.isArray(config.printers)) return [];

    return config.printers
      .map((printer) => this.normalizePrinter(printer as LegacyConfiguredPrinter))
      .filter((printer): printer is ConfiguredPrinter => printer !== null);
  }

  getPrinter(printerId: string): ConfiguredPrinter | undefined {
    return this.listPrinters().find((printer) => printer.id === printerId || printer.name === printerId);
  }

  private normalizePrinter(printer: LegacyConfiguredPrinter): ConfiguredPrinter | null {
    const id = this.stringValue(printer.id) ?? this.stringValue(printer.printer_id);
    const name = this.stringValue(printer.name) ?? id;
    const enabled = printer.enabled !== false;

    if (!id || !name) return null;

    const connection = this.normalizeConnection(printer);
    if (!connection) return null;

    return {
      id,
      name,
      enabled,
      connection,
    };
  }

  private normalizeConnection(printer: LegacyConfiguredPrinter): PrinterConnection | null {
    const connection = printer.connection as Record<string, unknown> | undefined;
    const connectionType = this.stringValue(connection?.type);

    if (connectionType === 'tcp') {
      const host = this.stringValue(connection?.host);
      if (!host) return null;

      return {
        type: 'tcp',
        host,
        port: this.numberValue(connection?.port) ?? 9100,
      };
    }

    if (connectionType === 'usb') {
      const printerName = this.stringValue(connection?.printerName);
      if (!printerName) return null;

      return {
        type: 'usb',
        printerName,
      };
    }

    const legacyType = this.stringValue(printer.type);
    if (legacyType === 'network') {
      const host = this.stringValue(printer.host);
      if (!host) return null;

      return {
        type: 'tcp',
        host,
        port: this.numberValue(printer.port) ?? 9100,
      };
    }

    return null;
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private numberValue(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  static ensureDefaultConfigFile(configPath = PrinterConfigService.resolveWritableConfigPath()): string {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, 'utf-8');
    }

    return configPath;
  }

  static resolveConfigPath(): string {
    if (process.env.PRINTER_CONFIG_PATH) {
      return process.env.PRINTER_CONFIG_PATH;
    }

    const programData = process.env.PROGRAMDATA;
    if (process.platform === 'win32' && programData) {
      const programDataConfig = path.join(programData, CONFIG_DIR_NAME, 'config', CONFIG_FILE_NAME);
      if (fs.existsSync(programDataConfig)) return programDataConfig;

      const legacyProgramDataConfig = path.join(programData, LEGACY_CONFIG_DIR_NAME, 'config', CONFIG_FILE_NAME);
      if (fs.existsSync(legacyProgramDataConfig)) return legacyProgramDataConfig;
    }

    return path.join(process.cwd(), 'config', CONFIG_FILE_NAME);
  }

  private static resolveWritableConfigPath(): string {
    if (process.env.PRINTER_CONFIG_PATH) {
      return process.env.PRINTER_CONFIG_PATH;
    }

    const programData = process.env.PROGRAMDATA;
    if (process.platform === 'win32' && programData) {
      return path.join(programData, CONFIG_DIR_NAME, 'config', CONFIG_FILE_NAME);
    }

    return path.join(process.cwd(), 'config', CONFIG_FILE_NAME);
  }
}
