import { Printer } from '../models/Printer';
import { UsbDriver } from '../drivers/UsbDriver';

export interface PrinterDriver {
  discover(): Promise<Printer[]>;
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

  /**
   * In test tới 1 máy in cụ thể.
   * printerId có thể match theo id (hash) hoặc theo tên hệ thống.
   */
  async print(printerId: string, data: Buffer): Promise<{ id: string; name: string }> {
    const printers = await this.discoverAll();
    const target = printers.find((p) => p.id === printerId || p.name === printerId);

    if (!target) {
      throw new Error(`Không tìm thấy máy in: ${printerId}`);
    }

    await this.usbDriver.write(target.name, data);

    return { id: target.id, name: target.name };
  }
}
