import { CreatePrintJobInput, PrintJob, PrintJobSnapshot } from './PrintJob';
import { QueueRepository } from './QueueRepository';
import { RetryPolicy } from './RetryPolicy';

type PrintExecutor = (job: PrintJob) => Promise<void>;

export class QueueManager {
  private workers = new Map<string, boolean>();

  constructor(
    private readonly repository: QueueRepository,
    private readonly retryPolicy: RetryPolicy,
    private readonly printExecutor: PrintExecutor
  ) {}

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
    if (this.workers.get(queueKey)) return;

    this.workers.set(queueKey, true);
    void this.processQueue(queueKey);
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
      await this.printExecutor(job);
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
        setTimeout(() => this.startWorker(job.queueKey), delayMs);
        return;
      }

      this.repository.setStatus(job, 'failed', {
        lastError,
        completedAt: new Date().toISOString(),
      });
    }
  }
}
