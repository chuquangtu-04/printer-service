import { Printer } from '../models/Printer';
import { UsbDriver } from '../drivers/UsbDriver';
import { NetworkPrinterDriver } from '../drivers/NetworkPrinterDriver';
import { PrinterConnection } from '../config/PrinterConfigService';
import { PrinterNotFoundError } from '../../common/errors';

export interface PrinterStatus {
  id: string;
  status: string;
}

export interface PrinterStatusTarget {
  id: string;
  printerName: string;
}

export interface PrinterDriver {
  discover(): Promise<Printer[]>;
  status(): Promise<PrinterStatus[]>;
}

export class PrinterManager {
  drivers: PrinterDriver[];
  private usbDriver: UsbDriver;

  constructor(drivers: PrinterDriver[] = [], usbDriver: UsbDriver = new UsbDriver()) {
    this.drivers = drivers;
    this.usbDriver = usbDriver;
  }

  registerDriver(driver: PrinterDriver) {
    this.drivers.push(driver);
  }

  async discoverAll(): Promise<Printer[]> {
    const results = await Promise.all(
      this.drivers.map((driver) => driver.discover().catch(() => []))
    );
    return results.flat();
  }

  async status(targets: PrinterStatusTarget[] = []): Promise<PrinterStatus[]> {
    if (targets.length > 0) {
      const printers = await this.discoverAll();

      return targets.map((target) => {
        const printer = printers.find((p) => p.name === target.printerName || p.id === target.printerName);
        return {
          id: target.id,
          status: printer?.status ?? 'offline',
        };
      });
    }

    const results = await Promise.all(
      this.drivers.map((driver) => driver.status().catch(() => []))
    );
    return results.flat();
  }

  async print(printerId: string, data: Buffer): Promise<{ id: string; name: string }> {
    const printers = await this.discoverAll();
    const target = printers.find((p) => p.id === printerId || p.name === printerId);

    if (!target) {
      throw new PrinterNotFoundError(printerId);
    }

    const connection = this.getConfiguredConnection(target);
    if (connection?.type === 'tcp') {
      await new NetworkPrinterDriver(connection.host, connection.port ?? 9100).write(data);
      return { id: target.id, name: target.name };
    }

    if (connection?.type === 'usb') {
      await this.usbDriver.write(connection.printerName, data);
      return { id: target.id, name: target.name };
    }

    await this.usbDriver.write(target.name, data);

    return { id: target.id, name: target.name };
  }

  private getConfiguredConnection(printer: Printer): PrinterConnection | undefined {
    const connection = printer.meta.connection;

    if (this.isTcpConnection(connection) || this.isUsbConnection(connection)) {
      return connection;
    }

    return undefined;
  }

  private isTcpConnection(connection: unknown): connection is Extract<PrinterConnection, { type: 'tcp' }> {
    return (
      typeof connection === 'object' &&
      connection !== null &&
      (connection as { type?: unknown }).type === 'tcp' &&
      typeof (connection as { host?: unknown }).host === 'string'
    );
  }

  private isUsbConnection(connection: unknown): connection is Extract<PrinterConnection, { type: 'usb' }> {
    return (
      typeof connection === 'object' &&
      connection !== null &&
      (connection as { type?: unknown }).type === 'usb' &&
      typeof (connection as { printerName?: unknown }).printerName === 'string'
    );
  }
}
