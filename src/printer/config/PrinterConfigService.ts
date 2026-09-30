import fs from 'fs';
import path from 'path';
import { ConfiguredLanPrinterNotFoundError } from '../../common/errors';

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

export interface LanDiscoveryConfig {
  ports: number[];
  subnetIp?: string;
  netmask?: string;
  concurrency?: number;
  timeoutMs?: number;
}

export interface SaveLanPrinterInput {
  id: string;
  name: string;
  host: string;
  port: number;
}

export interface UpdateLanPrinterNameInput {
  id: string;
  name: string;
}

interface PrinterConfigFile {
  printers?: unknown;
  discovery?: unknown;
}

interface PrinterDiscoveryConfig {
  ports?: unknown;
  subnetIp?: unknown;
  netmask?: unknown;
  concurrency?: unknown;
  timeoutMs?: unknown;
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
  discovery: {
    ports: [9100],
    subnetIp: '',
    netmask: '',
    concurrency: 40,
    timeoutMs: 300,
  },
  printers: [
    {
      id: 'kitchen-01',
      name: 'May in bep',
      connection: {
        type: 'tcp',
        host: '192.168.1.100',
        port: 9100,
      },
      enabled: false,
    },
  ],
};

export class PrinterConfigService {
  constructor(private readonly configPath = PrinterConfigService.resolveConfigPath()) {}

  listPrinters(): ConfiguredPrinter[] {
    const config = this.readConfig();
    if (!Array.isArray(config.printers)) return [];

    return config.printers
      .map((printer) => this.normalizePrinter(printer as LegacyConfiguredPrinter))
      .filter((printer): printer is ConfiguredPrinter => printer !== null);
  }

  getLanDiscoveryConfig(): LanDiscoveryConfig {
    const config = this.readConfig();
    const discovery = config.discovery as PrinterDiscoveryConfig | undefined;

    return {
      ports: this.normalizePorts(discovery?.ports),
      subnetIp: this.stringValue(discovery?.subnetIp),
      netmask: this.stringValue(discovery?.netmask),
      concurrency: this.positiveIntegerValue(discovery?.concurrency),
      timeoutMs: this.positiveIntegerValue(discovery?.timeoutMs),
    };
  }

  getLanDiscoveryPorts(): number[] {
    return this.getLanDiscoveryConfig().ports;
  }

  private normalizePorts(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    const uniquePorts = new Set<number>();

    for (const item of value) {
      const port = this.portValue(item);
      if (port !== undefined) uniquePorts.add(port);
    }

    return [...uniquePorts].sort((a, b) => a - b);
  }

  getPrinter(printerId: string): ConfiguredPrinter | undefined {
    return this.listPrinters().find((printer) => printer.id === printerId || printer.name === printerId);
  }

  saveLanPrinter(input: SaveLanPrinterInput): ConfiguredPrinter {
    const config = this.readConfig();
    const printers = Array.isArray(config.printers) ? [...config.printers] : [];
    const savedPrinter: ConfiguredPrinter = {
      id: input.id,
      name: input.name,
      enabled: true,
      connection: {
        type: 'tcp',
        host: input.host,
        port: input.port,
      },
    };

    const existingIndex = printers.findIndex((printer) => this.matchesPrinterId(printer, input.id));
    if (existingIndex >= 0) {
      printers[existingIndex] = savedPrinter;
    } else {
      printers.push(savedPrinter);
    }

    this.writeConfig({
      ...config,
      discovery: config.discovery ?? DEFAULT_CONFIG.discovery,
      printers,
    });

    return savedPrinter;
  }

  updateLanPrinterName(input: UpdateLanPrinterNameInput): ConfiguredPrinter {
    const config = this.readConfig();
    const printers = Array.isArray(config.printers) ? [...config.printers] : [];
    const printerIndex = this.findLanPrinterIndex(printers, input.id);

    if (printerIndex < 0) {
      throw new ConfiguredLanPrinterNotFoundError(input.id);
    }

    const existingPrinter = this.asRecord(printers[printerIndex]);
    printers[printerIndex] = {
      ...existingPrinter,
      name: input.name,
    };

    this.writeConfig({
      ...config,
      discovery: config.discovery ?? DEFAULT_CONFIG.discovery,
      printers,
    });

    const updatedPrinter = this.normalizePrinter(printers[printerIndex] as LegacyConfiguredPrinter);
    if (!updatedPrinter) {
      throw new ConfiguredLanPrinterNotFoundError(input.id);
    }

    return updatedPrinter;
  }

  deleteLanPrinter(id: string): ConfiguredPrinter {
    const config = this.readConfig();
    const printers = Array.isArray(config.printers) ? [...config.printers] : [];
    const printerIndex = this.findLanPrinterIndex(printers, id);

    if (printerIndex < 0) {
      throw new ConfiguredLanPrinterNotFoundError(id);
    }

    const deletedPrinter = this.normalizePrinter(printers[printerIndex] as LegacyConfiguredPrinter);
    if (!deletedPrinter) {
      throw new ConfiguredLanPrinterNotFoundError(id);
    }

    printers.splice(printerIndex, 1);

    this.writeConfig({
      ...config,
      discovery: config.discovery ?? DEFAULT_CONFIG.discovery,
      printers,
    });

    return deletedPrinter;
  }

  getConfigPath(): string {
    return this.configPath;
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

  private portValue(value: unknown): number | undefined {
    const parsed = typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : NaN;

    return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : undefined;
  }

  private positiveIntegerValue(value: unknown): number | undefined {
    const parsed = typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : NaN;

    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  private readConfig(): PrinterConfigFile {
    if (!fs.existsSync(this.configPath)) return DEFAULT_CONFIG;

    const content = this.readJsonText(this.configPath);
    const config = JSON.parse(content) as PrinterConfigFile;

    return {
      discovery: config.discovery ?? DEFAULT_CONFIG.discovery,
      printers: config.printers ?? DEFAULT_CONFIG.printers,
    };
  }

  private writeConfig(config: PrinterConfigFile): void {
    fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
    fs.writeFileSync(this.configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
  }

  private matchesPrinterId(printer: unknown, id: string): boolean {
    if (typeof printer !== 'object' || printer === null) return false;

    const candidate = printer as { id?: unknown; printer_id?: unknown };
    return candidate.id === id || candidate.printer_id === id;
  }

  private findLanPrinterIndex(printers: unknown[], id: string): number {
    return printers.findIndex((printer) => {
      if (!this.matchesPrinterId(printer, id)) return false;

      const normalizedPrinter = this.normalizePrinter(printer as LegacyConfiguredPrinter);
      return normalizedPrinter?.connection.type === 'tcp';
    });
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  }

  static ensureDefaultConfigFile(configPath = PrinterConfigService.resolveWritableConfigPath()): string {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, 'utf-8');
    } else {
      PrinterConfigService.ensureDiscoveryConfig(configPath);
    }

    return configPath;
  }

  private static ensureDiscoveryConfig(configPath: string): void {
    const content = PrinterConfigService.readJsonText(configPath);
    const config = JSON.parse(content) as PrinterConfigFile;
    const discovery = config.discovery as PrinterDiscoveryConfig | undefined;

    if (Array.isArray(discovery?.ports)) return;

    fs.writeFileSync(
      configPath,
      `${JSON.stringify({ ...config, discovery: DEFAULT_CONFIG.discovery }, null, 2)}\n`,
      'utf-8'
    );
  }

  private readJsonText(filePath: string): string {
    return PrinterConfigService.readJsonText(filePath);
  }

  private static readJsonText(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
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
