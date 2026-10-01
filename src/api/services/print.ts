import { PrinterManager } from '../../printer/manager/PrinterManager';
import { SpoolerDriver } from '../../printer/drivers/SpoolerDriver';
import { ConfiguredPrinterDriver } from '../../printer/drivers/ConfiguredPrinterDriver';
import { BuilderFactory } from '../../printer/builders/BuilderFactory';
import { QueueManager } from '../../printer/queue/QueueManager';
import { QueueRepository } from '../../printer/queue/QueueRepository';
import { RetryPolicy } from '../../printer/queue/RetryPolicy';
import { PrintJobSnapshot } from '../../printer/queue/PrintJob';
import { PrinterConfigService } from '../../printer/config/PrinterConfigService';
import { CategoryPrinterNotConfiguredError, ValidationError } from '../../common/errors';

interface PrintRequest {
  printer?: string;
  categoryId?: string;
  template: string;
  data: unknown;
}

interface RoutedPrintJob {
  printer: string;
  template: string;
  data: unknown;
  categoryId?: string;
}

interface PreparedPrintJob extends RoutedPrintJob {
  buffer: Buffer;
}

type PrintResult =
  | { success: true; message: string; job: PrintJobSnapshot }
  | { success: true; message: string; jobs: PrintJobSnapshot[] };

class PrintService {
  private manager = new PrinterManager([new ConfiguredPrinterDriver(), new SpoolerDriver()]);
  private configService = new PrinterConfigService();
  private queueManager = new QueueManager(
    new QueueRepository(),
    new RetryPolicy(),
    async (job, progress) => {
      await this.manager.print(job.printerName, job.buffer, progress);
    }
  );

  async print(req: PrintRequest): Promise<PrintResult> {
    const routedJobs = this.route(req);
    const preparedJobs: PreparedPrintJob[] = [];
    const jobs: PrintJobSnapshot[] = [];

    for (const routedJob of routedJobs) {
      preparedJobs.push(await this.prepare(routedJob));
    }

    for (const preparedJob of preparedJobs) {
      jobs.push(this.enqueue(preparedJob));
    }

    if (jobs.length === 1) {
      const job = jobs[0];
      return { success: true, message: `Da them lenh in vao queue "${job.printer}"`, job };
    }

    return { success: true, message: `Da them ${jobs.length} lenh in vao queue`, jobs };
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

  private route(req: PrintRequest): RoutedPrintJob[] {
    const { printer, categoryId, template, data } = req;

    if (printer) {
      return [{ printer, template, data }];
    }

    const itemRoutedJobs = this.routeByItemCategory(req);
    if (itemRoutedJobs.length > 0) {
      return itemRoutedJobs;
    }

    if (categoryId) {
      return [{ printer: this.resolveCategoryPrinter(categoryId), template, data, categoryId }];
    }

    throw new ValidationError('Thieu field "printer" hoac "categoryId" de dinh tuyen may in');
  }

  private routeByItemCategory(req: PrintRequest): RoutedPrintJob[] {
    const dataRecord = this.asRecord(req.data);
    const items = Array.isArray(dataRecord?.items) ? dataRecord.items : [];
    const hasItemCategory = items.some((item) => this.itemCategoryId(item) !== undefined);

    if (!hasItemCategory) return [];

    const groups = new Map<string, unknown[]>();
    for (const item of items) {
      const categoryId = this.itemCategoryId(item);
      if (!categoryId) {
        throw new ValidationError('Item thieu categoryId de dinh tuyen may in');
      }

      const group = groups.get(categoryId) ?? [];
      group.push(item);
      groups.set(categoryId, group);
    }

    return [...groups.entries()].map(([categoryId, groupedItems]) => ({
      printer: this.resolveCategoryPrinter(categoryId),
      template: req.template,
      categoryId,
      data: {
        ...dataRecord,
        items: groupedItems,
      },
    }));
  }

  private async prepare(req: RoutedPrintJob): Promise<PreparedPrintJob> {
    return {
      ...req,
      buffer: await BuilderFactory.build(req.template, req.data),
    };
  }

  private enqueue(req: PreparedPrintJob): PrintJobSnapshot {
    const { printer, template, data, categoryId, buffer } = req;

    return this.queueManager.add({
      queueKey: printer,
      printer,
      printerName: printer,
      template,
      categoryId,
      data,
      buffer,
    });
  }

  private resolveCategoryPrinter(categoryId: string): string {
    const printer = this.configService.getCategoryPrinter(categoryId);
    if (!printer) {
      throw new CategoryPrinterNotConfiguredError(categoryId);
    }

    return printer;
  }

  private itemCategoryId(item: unknown): string | undefined {
    const record = this.asRecord(item);
    return this.stringValue(record?.categoryId) ?? this.stringValue(record?.category_id) ?? this.stringValue(record?.category);
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined;
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
}

export default new PrintService();
