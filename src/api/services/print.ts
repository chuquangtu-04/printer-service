import { PrinterManager } from '../../printer/manager/PrinterManager';
import { SpoolerDriver } from '../../printer/drivers/SpoolerDriver';
import { ConfiguredPrinterDriver } from '../../printer/drivers/ConfiguredPrinterDriver';
import { BuilderFactory } from '../../printer/builders/BuilderFactory';
import { QueueManager } from '../../printer/queue/QueueManager';
import { QueueRepository } from '../../printer/queue/QueueRepository';
import { RetryPolicy } from '../../printer/queue/RetryPolicy';
import { PrintJobSnapshot } from '../../printer/queue/PrintJob';

interface PrintRequest {
  printer: string;
  template: string;
  data: unknown;
}

class PrintService {
  private manager = new PrinterManager([new ConfiguredPrinterDriver(), new SpoolerDriver()]);
  private queueManager = new QueueManager(
    new QueueRepository(),
    new RetryPolicy(),
    async (job, progress) => {
      await this.manager.print(job.printerName, job.buffer, progress);
    }
  );

  async print(req: PrintRequest): Promise<{ success: true; message: string; job: PrintJobSnapshot }> {
    const { printer, template, data } = req;

    const buffer = await BuilderFactory.build(template, data);
    const job = this.queueManager.add({
      queueKey: printer,
      printer,
      printerName: printer,
      template,
      data,
      buffer,
    });

    return { success: true, message: `Da them lenh in vao queue "${printer}"`, job };
  }

  listQueue(): PrintJobSnapshot[] {
    return this.queueManager.list();
  }

  listFailedQueue(): PrintJobSnapshot[] {
    return this.queueManager.listFailed();
  }

  clearQueue(): { success: true; removed: number } {
    return this.queueManager.clear();
  }

  retryQueue(jobId?: number): PrintJobSnapshot[] {
    return this.queueManager.retry(jobId);
  }
}

export default new PrintService();
