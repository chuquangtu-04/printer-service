"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
class QueueManager {
    repository;
    retryPolicy;
    printExecutor;
    workers = new Map();
    constructor(repository, retryPolicy, printExecutor) {
        this.repository = repository;
        this.retryPolicy = retryPolicy;
        this.printExecutor = printExecutor;
    }
    add(input) {
        const job = this.repository.add({
            ...input,
            maxAttempts: this.retryPolicy.maxAttempts,
        });
        this.startWorker(job.queueKey);
        return this.repository.toSnapshot(job);
    }
    list() {
        return this.repository.list();
    }
    clear() {
        return {
            success: true,
            removed: this.repository.clear(),
        };
    }
    retry(jobId) {
        const jobs = jobId === undefined
            ? this.repository.findFailed()
            : [this.repository.find(jobId)].filter((job) => job !== undefined);
        for (const job of jobs) {
            if (job.status === 'failed') {
                this.repository.resetForRetry(job);
                this.startWorker(job.queueKey);
            }
        }
        return jobs.map((job) => this.repository.toSnapshot(job));
    }
    startWorker(queueKey) {
        if (this.workers.get(queueKey))
            return;
        this.workers.set(queueKey, true);
        void this.processQueue(queueKey);
    }
    async processQueue(queueKey) {
        try {
            while (true) {
                const job = this.repository.nextRunnable(queueKey);
                if (!job)
                    break;
                await this.processJob(job);
                if (job.status === 'waiting') {
                    break;
                }
            }
        }
        finally {
            this.workers.set(queueKey, false);
            if (this.repository.nextRunnable(queueKey)) {
                this.startWorker(queueKey);
            }
        }
    }
    async processJob(job) {
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
        }
        catch (err) {
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
exports.QueueManager = QueueManager;
