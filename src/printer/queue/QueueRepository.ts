import { CreatePrintJobInput, PrintJob, PrintJobSnapshot, PrintJobStatus } from './PrintJob';

export class QueueRepository {
  private queues = new Map<string, PrintJob[]>();
  private nextId = 1;

  add(input: CreatePrintJobInput): PrintJob {
    const now = new Date().toISOString();
    const job: PrintJob = {
      id: this.nextId++,
      queueKey: input.queueKey,
      printer: input.printer,
      printerName: input.printerName,
      template: input.template,
      buffer: input.buffer,
      status: 'waiting',
      attempts: 0,
      maxAttempts: input.maxAttempts,
      createdAt: now,
      updatedAt: now,
    };

    this.getQueue(input.queueKey).push(job);
    return job;
  }

  list(): PrintJobSnapshot[] {
    return Array.from(this.queues.values())
      .flat()
      .sort((a, b) => a.id - b.id)
      .map((job) => this.toSnapshot(job));
  }

  clear(): number {
    let removed = 0;

    for (const [queueKey, jobs] of this.queues.entries()) {
      const kept = jobs.filter((job) => job.status === 'printing');
      removed += jobs.length - kept.length;

      if (kept.length > 0) {
        this.queues.set(queueKey, kept);
      } else {
        this.queues.delete(queueKey);
      }
    }

    return removed;
  }

  find(id: number): PrintJob | undefined {
    return Array.from(this.queues.values()).flat().find((job) => job.id === id);
  }

  findFailed(): PrintJob[] {
    return Array.from(this.queues.values()).flat().filter((job) => job.status === 'failed');
  }

  nextRunnable(queueKey: string, now = Date.now()): PrintJob | undefined {
    const job = this.getQueue(queueKey).find((item) => item.status === 'waiting');
    if (!job || (job.nextRunAt !== undefined && job.nextRunAt > now)) {
      return undefined;
    }
    return job;
  }

  hasPending(queueKey: string): boolean {
    return this.getQueue(queueKey).some((job) => job.status === 'waiting');
  }

  setStatus(job: PrintJob, status: PrintJobStatus, patch: Partial<PrintJob> = {}): void {
    Object.assign(job, patch, {
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  resetForRetry(job: PrintJob): void {
    this.setStatus(job, 'waiting', {
      attempts: 0,
      lastError: undefined,
      nextRunAt: undefined,
      startedAt: undefined,
      completedAt: undefined,
    });
  }

  toSnapshot(job: PrintJob): PrintJobSnapshot {
    return {
      id: job.id,
      status: job.status,
      printer: job.printer,
      printerName: job.printerName,
      template: job.template,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      lastError: job.lastError,
    };
  }

  private getQueue(queueKey: string): PrintJob[] {
    const existing = this.queues.get(queueKey);
    if (existing) return existing;

    const queue: PrintJob[] = [];
    this.queues.set(queueKey, queue);
    return queue;
  }
}
