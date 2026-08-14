import { Printer } from '../models/Printer';
import type { PrinterStatus } from '../manager/PrinterManager';
import { PrinterConfigService } from '../config/PrinterConfigService';
import { NetworkPrinterDriver } from './NetworkPrinterDriver';

export class ConfiguredPrinterDriver {
  constructor(private readonly configService = new PrinterConfigService()) {}

  async discover(): Promise<Printer[]> {
    return this.configService.listPrinters()
      .filter((printer) => printer.enabled)
      .map((printer) => new Printer({
        id: printer.id,
        name: printer.name,
        type: printer.connection.type === 'tcp' ? 'NETWORK' : 'USB',
        status: 'unknown',
        isDefault: false,
        port: this.portLabel(printer.connection),
        meta: {
          source: 'config',
          connection: printer.connection,
        },
      }));
  }

  async status(): Promise<PrinterStatus[]> {
    const printers = this.configService.listPrinters().filter((printer) => printer.enabled);

    return Promise.all(printers.map(async (printer) => {
      if (printer.connection.type !== 'tcp') {
        return {
          id: printer.id,
          status: 'unknown',
        };
      }

      const driver = new NetworkPrinterDriver(
        printer.connection.host,
        printer.connection.port ?? 9100,
        1500
      );

      return {
        id: printer.id,
        status: await driver.testConnection() ? 'online' : 'offline',
      };
    }));
  }

  private portLabel(connection: { type: string; host?: string; port?: number; printerName?: string }): string | null {
    if (connection.type === 'tcp' && connection.host) {
      return `${connection.host}:${connection.port ?? 9100}`;
    }

    if (connection.type === 'usb' && connection.printerName) {
      return connection.printerName;
    }

    return null;
  }
}
