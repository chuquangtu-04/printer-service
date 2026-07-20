export type PrintJobStatus = 'waiting' | 'printing' | 'completed' | 'failed';

export interface PrintJob {
  id: number;
  queueKey: string;
  printer: string;
  printerName: string;
  template: string;
  buffer: Buffer;
  status: PrintJobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  nextRunAt?: number;
  lastError?: string;
}

export interface CreatePrintJobInput {
  queueKey: string;
  printer: string;
  printerName: string;
  template: string;
  buffer: Buffer;
  maxAttempts: number;
}

export interface PrintJobSnapshot {
  id: number;
  status: PrintJobStatus;
  printer: string;
  printerName: string;
  template: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  lastError?: string;
}
