import { PrinterManager } from '../manager/PrinterManager';
import { SpoolerDriver } from '../drivers/SpoolerDriver';
import { BuilderFactory } from '../builders/BuilderFactory';
import printerConfig from '../../config/printerConfig';
import { PrinterAliasNotFoundError, PrinterNotFoundError } from '../../common/errors';

interface PrintRequest {
  printer: string;
  template: string;
  data: unknown;
}

class PrintService {
  private manager = new PrinterManager([new SpoolerDriver()]);

  async print(req: PrintRequest): Promise<{ success: true; message: string }> {
    const { printer: alias, template, data } = req;

    const realName = printerConfig.resolve(alias);
    if (!realName) throw new PrinterAliasNotFoundError(alias);

    const buffer = BuilderFactory.build(template, data);

    try {
      await this.manager.print(realName, buffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.startsWith('Không tìm thấy máy in') || message.startsWith('KhÃ´ng tÃ¬m tháº¥y mÃ¡y in')) {
        throw new PrinterNotFoundError(realName);
      }
      throw err;
    }

    return { success: true, message: `Đã gửi lệnh in tới "${alias}" (${realName})` };
  }
}

export default new PrintService();
