import { Printer } from '../models/Printer';

export interface PrinterDriver {
  discover(): Promise<Printer[]>;
}

export class PrinterManager {
  drivers: PrinterDriver[];

  constructor(drivers: PrinterDriver[] = []) {
    this.drivers = drivers;
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
}
