import { PrinterManager } from '../manager/PrinterManager';
import { SpoolerDriver } from '../drivers/SpoolerDriver';
import { BuilderFactory } from '../builders/BuilderFactory';
import printerConfig from '../../config/printerConfig';
import { PrinterAliasNotFoundError, PrinterNotFoundError } from '../../common/errors';

interface PrintRequest {
  printer: string;   // alias, vd "cashier"
  template: string;  // vd "receipt"
  data: any;
}

class PrintService {
  private manager = new PrinterManager([new SpoolerDriver()]);

  async print(req: PrintRequest): Promise<{ success: true; message: string }> {
    const { printer: alias, template, data } = req;

    // 1. Resolve alias -> tên máy in thật
    const realName = printerConfig.resolve(alias);
    if (!realName) throw new PrinterAliasNotFoundError(alias);

    // 2. Builder: dựng nội dung theo template
    const buffer = BuilderFactory.build(template, data);

    // 3. PrinterManager: tìm máy in đang online + gửi qua Driver
    try {
      await this.manager.print(realName, buffer);
    } catch (err: any) {
      if (err.message?.startsWith('Không tìm thấy máy in')) {
        throw new PrinterNotFoundError(realName);
      }
      throw err;
    }

    return { success: true, message: `Đã gửi lệnh in tới "${alias}" (${realName})` };
  }
}

export default new PrintService();
