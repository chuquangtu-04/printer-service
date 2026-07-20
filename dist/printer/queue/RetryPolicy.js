"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryPolicy = void 0;
class RetryPolicy {
    delaysMs;
    constructor(delaysMs = [2000, 5000, 10000]) {
        this.delaysMs = delaysMs;
    }
    get maxAttempts() {
        return this.delaysMs.length + 1;
    }
    shouldRetry(attempts, maxAttempts = this.maxAttempts) {
        return attempts < maxAttempts;
    }
    delayForAttempt(attempts) {
        return this.delaysMs[Math.max(0, attempts - 1)] ?? this.delaysMs[this.delaysMs.length - 1] ?? 0;
    }
}
exports.RetryPolicy = RetryPolicy;
