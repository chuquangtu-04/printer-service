import { PrinterManager } from '../../printer/manager/PrinterManager';
import { SpoolerDriver } from '../../printer/drivers/SpoolerDriver';
import { ConfiguredPrinterDriver } from '../../printer/drivers/ConfiguredPrinterDriver';
import { TestBuilder } from '../../printer/builders/TestBuilder';
import { LanPrinterDiscovery, LanPrinterDiscoveryOptions } from '../../printer/discovery/LanPrinterDiscovery';
import { PrinterConfigService } from '../../printer/config/PrinterConfigService';

class PrinterService {
  manager: PrinterManager;
  private readonly configService = new PrinterConfigService();
  private readonly lanDiscovery = new LanPrinterDiscovery();

  constructor() {
    this.manager = new PrinterManager([new ConfiguredPrinterDriver(this.configService), new SpoolerDriver()]);
  }

  async listPrinters() {
    const printers = await this.manager.discoverAll();
    return printers.map((p) => p.toJSON());
  }

  async discoverLanPrinters(options: LanPrinterDiscoveryOptions) {
    const discoveryConfig = this.configService.getLanDiscoveryConfig();

    return this.lanDiscovery.discover({
      ...discoveryConfig,
      ...options,
      ports: discoveryConfig.ports,
    });
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
