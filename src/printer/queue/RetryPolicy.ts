export class RetryPolicy {
  constructor(private readonly delaysMs = [2000, 5000, 10000]) {}

  get maxAttempts(): number {
    return this.delaysMs.length + 1;
  }

  shouldRetry(attempts: number, maxAttempts = this.maxAttempts): boolean {
    return attempts < maxAttempts;
  }

  delayForAttempt(attempts: number): number {
    return this.delaysMs[Math.max(0, attempts - 1)] ?? this.delaysMs[this.delaysMs.length - 1] ?? 0;
  }
}
