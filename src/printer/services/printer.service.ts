import { PrinterManager } from '../manager/PrinterManager';
import { SpoolerDriver } from '../drivers/SpoolerDriver';

class PrinterService {
  manager: PrinterManager;

  constructor() {
    this.manager = new PrinterManager([new SpoolerDriver()]);
  }

  async listPrinters() {
    const printers = await this.manager.discoverAll();
    return printers.map((p) => p.toJSON());
  }
}

export const printerService = new PrinterService();
