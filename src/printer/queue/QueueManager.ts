import { CreatePrintJobInput, PrintJob, PrintJobSnapshot } from './PrintJob';
import { QueueRepository } from './QueueRepository';
import { RetryPolicy } from './RetryPolicy';

export interface PrintProgress {
  status: 'spooled';
  spoolerJobId?: number;
}

type PrintExecutor = (job: PrintJob, progress: (progress: PrintProgress) => void) => Promise<void>;

export class QueueManager {
  private workers = new Map<string, boolean>();
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly repository: QueueRepository,
    private readonly retryPolicy: RetryPolicy,
    private readonly printExecutor: PrintExecutor
  ) {
    for (const queueKey of this.repository.queueKeysWithPending()) {
      this.scheduleWorker(queueKey, 0);
    }
  }

  add(input: Omit<CreatePrintJobInput, 'maxAttempts'>): PrintJobSnapshot {
    const job = this.repository.add({
      ...input,
      maxAttempts: this.retryPolicy.maxAttempts,
    });

    this.startWorker(job.queueKey);
    return this.repository.toSnapshot(job);
  }

  list(): PrintJobSnapshot[] {
    return this.repository.list();
  }

  listFailed(): PrintJobSnapshot[] {
    return this.repository.findFailed().map((job) => this.repository.toSnapshot(job, { includeData: true }));
  }

  clear(): { success: true; removed: number } {
    return {
      success: true,
      removed: this.repository.clear(),
    };
  }

  retry(jobId?: number): PrintJobSnapshot[] {
    const jobs = jobId === undefined
      ? this.repository.findFailed()
      : [this.repository.find(jobId)].filter((job): job is PrintJob => job !== undefined);

    for (const job of jobs) {
      if (job.status === 'failed') {
        this.repository.resetForRetry(job);
        this.startWorker(job.queueKey);
      }
    }

    return jobs.map((job) => this.repository.toSnapshot(job));
  }

  private startWorker(queueKey: string): void {
    const timer = this.timers.get(queueKey);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(queueKey);
    }

    if (this.workers.get(queueKey)) return;

    this.workers.set(queueKey, true);
    void this.processQueue(queueKey);
  }

  private scheduleWorker(queueKey: string, delayMs: number): void {
    const existing = this.timers.get(queueKey);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.timers.delete(queueKey);
      this.startWorker(queueKey);
    }, Math.max(0, delayMs));

    this.timers.set(queueKey, timer);
  }

  private async processQueue(queueKey: string): Promise<void> {
    try {
      while (true) {
        const job = this.repository.nextRunnable(queueKey);
        if (!job) break;

        await this.processJob(job);

        if (job.status === 'waiting') {
          break;
        }
      }
    } finally {
      this.workers.set(queueKey, false);

      if (this.repository.nextRunnable(queueKey)) {
        this.startWorker(queueKey);
        return;
      }

      const nextRunAt = this.repository.nextWaitingRunAt(queueKey);
      if (nextRunAt !== undefined) {
        this.scheduleWorker(queueKey, nextRunAt - Date.now());
      }
    }
  }

  private async processJob(job: PrintJob): Promise<void> {
    const startedAt = new Date().toISOString();
    this.repository.setStatus(job, 'printing', {
      attempts: job.attempts + 1,
      startedAt,
      lastError: undefined,
      nextRunAt: undefined,
    });

    try {
      await this.printExecutor(job, (progress) => {
        if (progress.status === 'spooled') {
          this.repository.setStatus(job, 'spooled', {
            spoolerJobId: progress.spoolerJobId,
          });
        }
      });
      this.repository.setStatus(job, 'completed', {
        completedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const lastError = err instanceof Error ? err.message : String(err);

      if (this.retryPolicy.shouldRetry(job.attempts, job.maxAttempts)) {
        const delayMs = this.retryPolicy.delayForAttempt(job.attempts);
        this.repository.setStatus(job, 'waiting', {
          lastError,
          nextRunAt: Date.now() + delayMs,
        });
        this.scheduleWorker(job.queueKey, delayMs);
        return;
      }

      this.repository.setStatus(job, 'failed', {
        lastError,
        completedAt: new Date().toISOString(),
      });
    }
  }
}
