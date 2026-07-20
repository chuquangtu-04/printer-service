import { PrinterManager } from '../manager/PrinterManager';
import { SpoolerDriver } from '../drivers/SpoolerDriver';
import { BuilderFactory } from '../builders/BuilderFactory';
import printerConfig from '../../config/printerConfig';
import { PrinterAliasNotFoundError } from '../../common/errors';
import { QueueManager } from '../queue/QueueManager';
import { QueueRepository } from '../queue/QueueRepository';
import { RetryPolicy } from '../queue/RetryPolicy';
import { PrintJobSnapshot } from '../queue/PrintJob';

interface PrintRequest {
  printer: string;
  template: string;
  data: unknown;
}

class PrintService {
  private manager = new PrinterManager([new SpoolerDriver()]);
  private queueManager = new QueueManager(
    new QueueRepository(),
    new RetryPolicy(),
    async (job) => {
      await this.manager.print(job.printerName, job.buffer);
    }
  );

  async print(req: PrintRequest): Promise<{ success: true; message: string; job: PrintJobSnapshot }> {
    const { printer: alias, template, data } = req;

    const realName = printerConfig.resolve(alias);
    if (!realName) throw new PrinterAliasNotFoundError(alias);

    const buffer = BuilderFactory.build(template, data);
    const job = this.queueManager.add({
      queueKey: alias,
      printer: alias,
      printerName: realName,
      template,
      buffer,
    });

    return { success: true, message: `Da them lenh in vao queue "${alias}" (${realName})`, job };
  }

  listQueue(): PrintJobSnapshot[] {
    return this.queueManager.list();
  }

  clearQueue(): { success: true; removed: number } {
    return this.queueManager.clear();
  }

  retryQueue(jobId?: number): PrintJobSnapshot[] {
    return this.queueManager.retry(jobId);
  }
}

export default new PrintService();
