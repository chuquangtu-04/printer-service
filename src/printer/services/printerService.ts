import { PrinterManager } from '../manager/PrinterManager';
import { SpoolerDriver } from '../drivers/SpoolerDriver';
import { ConfiguredPrinterDriver } from '../drivers/ConfiguredPrinterDriver';
import { TestBuilder } from '../builders/TestBuilder';

class PrinterService {
  manager: PrinterManager;

  constructor() {
    this.manager = new PrinterManager([new ConfiguredPrinterDriver(), new SpoolerDriver()]);
  }

  async listPrinters() {
    const printers = await this.manager.discoverAll();
    return printers.map((p) => p.toJSON());
  }

  async testPrint(printerId: string) {
    const content = await new TestBuilder().build(undefined);
    const target = await this.manager.print(printerId, content);
    return {
      success: true,
      message: `Da gui lenh test print toi ${target.name}`,
    };
  }
}

export const printerService = new PrinterService();
