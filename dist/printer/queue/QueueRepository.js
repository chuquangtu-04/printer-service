"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueRepository = void 0;
class QueueRepository {
    queues = new Map();
    nextId = 1;
    add(input) {
        const now = new Date().toISOString();
        const job = {
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
    list() {
        return Array.from(this.queues.values())
            .flat()
            .sort((a, b) => a.id - b.id)
            .map((job) => this.toSnapshot(job));
    }
    clear() {
        let removed = 0;
        for (const [queueKey, jobs] of this.queues.entries()) {
            const kept = jobs.filter((job) => job.status === 'printing');
            removed += jobs.length - kept.length;
            if (kept.length > 0) {
                this.queues.set(queueKey, kept);
            }
            else {
                this.queues.delete(queueKey);
            }
        }
        return removed;
    }
    find(id) {
        return Array.from(this.queues.values()).flat().find((job) => job.id === id);
    }
    findFailed() {
        return Array.from(this.queues.values()).flat().filter((job) => job.status === 'failed');
    }
    nextRunnable(queueKey, now = Date.now()) {
        const job = this.getQueue(queueKey).find((item) => item.status === 'waiting');
        if (!job || (job.nextRunAt !== undefined && job.nextRunAt > now)) {
            return undefined;
        }
        return job;
    }
    hasPending(queueKey) {
        return this.getQueue(queueKey).some((job) => job.status === 'waiting');
    }
    setStatus(job, status, patch = {}) {
        Object.assign(job, patch, {
            status,
            updatedAt: new Date().toISOString(),
        });
    }
    resetForRetry(job) {
        this.setStatus(job, 'waiting', {
            attempts: 0,
            lastError: undefined,
            nextRunAt: undefined,
            startedAt: undefined,
            completedAt: undefined,
        });
    }
    toSnapshot(job) {
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
    getQueue(queueKey) {
        const existing = this.queues.get(queueKey);
        if (existing)
            return existing;
        const queue = [];
        this.queues.set(queueKey, queue);
        return queue;
    }
}
exports.QueueRepository = QueueRepository;
