import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { CreatePrintJobInput, PrintJob, PrintJobSnapshot, PrintJobStatus } from './PrintJob';

const DEFAULT_QUEUE_DB_PATH = path.join(process.cwd(), 'data', 'print-queue.sqlite');
const DEFAULT_COMPLETED_RETENTION_HOURS = 24;
const DEFAULT_MAX_COMPLETED_JOBS = 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

interface PrintJobRow {
  id: number;
  queue_key: string;
  printer: string;
  printer_name: string;
  template: string;
  payload_json: string | null;
  buffer: Uint8Array;
  status: PrintJobStatus;
  attempts: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  next_run_at: number | null;
  last_error: string | null;
  spooler_job_id: number | null;
}

export class QueueRepository {
  private readonly db: DatabaseSync;
  private readonly completedRetentionHours = positiveInteger(
    process.env.PRINTER_QUEUE_COMPLETED_RETENTION_HOURS,
    DEFAULT_COMPLETED_RETENTION_HOURS
  );
  private readonly maxCompletedJobs = positiveInteger(
    process.env.PRINTER_QUEUE_MAX_COMPLETED_JOBS,
    DEFAULT_MAX_COMPLETED_JOBS
  );

  constructor(dbPath = process.env.PRINTER_QUEUE_DB_PATH || DEFAULT_QUEUE_DB_PATH) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.initialize();
  }

  add(input: CreatePrintJobInput): PrintJob {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      INSERT INTO print_jobs (
        queue_key, printer, printer_name, template, payload_json, buffer, status,
        attempts, max_attempts, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'waiting', 0, ?, ?, ?)
    `).run(
      input.queueKey,
      input.printer,
      input.printerName,
      input.template,
      toJsonText(input.data),
      input.buffer,
      input.maxAttempts,
      now,
      now
    );

    const job = this.find(Number(result.lastInsertRowid));
    if (!job) {
      throw new Error('Khong doc duoc print job vua tao tu SQLite');
    }

    return job;
  }

  list(): PrintJobSnapshot[] {
    return this.db.prepare('SELECT * FROM print_jobs ORDER BY id ASC')
      .all()
      .map((row) => this.toSnapshot(this.rowToJob(row as unknown as PrintJobRow)));
  }

  clear(): number {
    const result = this.db.prepare(`
      DELETE FROM print_jobs
      WHERE status NOT IN ('printing', 'spooled')
    `).run();

    return Number(result.changes);
  }

  find(id: number): PrintJob | undefined {
    const row = this.db.prepare('SELECT * FROM print_jobs WHERE id = ?').get(id) as PrintJobRow | undefined;
    return row ? this.rowToJob(row) : undefined;
  }

  findFailed(): PrintJob[] {
    return this.db.prepare("SELECT * FROM print_jobs WHERE status = 'failed' ORDER BY id ASC")
      .all()
      .map((row) => this.rowToJob(row as unknown as PrintJobRow));
  }

  close(): void {
    this.db.close();
  }

  nextRunnable(queueKey: string, now = Date.now()): PrintJob | undefined {
    const row = this.db.prepare(`
      SELECT * FROM print_jobs
      WHERE queue_key = ?
        AND status = 'waiting'
        AND (next_run_at IS NULL OR next_run_at <= ?)
      ORDER BY id ASC
      LIMIT 1
    `).get(queueKey, now) as PrintJobRow | undefined;

    return row ? this.rowToJob(row) : undefined;
  }

  nextWaitingRunAt(queueKey: string): number | undefined {
    const row = this.db.prepare(`
      SELECT MIN(next_run_at) AS nextRunAt
      FROM print_jobs
      WHERE queue_key = ?
        AND status = 'waiting'
        AND next_run_at IS NOT NULL
    `).get(queueKey) as { nextRunAt: number | null } | undefined;

    return row?.nextRunAt ?? undefined;
  }

  queueKeysWithPending(): string[] {
    return this.db.prepare(`
      SELECT DISTINCT queue_key AS queueKey
      FROM print_jobs
      WHERE status = 'waiting'
      ORDER BY queue_key ASC
    `).all().map((row) => (row as { queueKey: string }).queueKey);
  }

  setStatus(job: PrintJob, status: PrintJobStatus, patch: Partial<PrintJob> = {}): void {
    Object.assign(job, patch, {
      status,
      updatedAt: new Date().toISOString(),
    });

    this.db.prepare(`
      UPDATE print_jobs
      SET status = ?,
        attempts = ?,
        started_at = ?,
        completed_at = ?,
        next_run_at = ?,
        last_error = ?,
        spooler_job_id = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      job.status,
      job.attempts,
      job.startedAt ?? null,
      job.completedAt ?? null,
      job.nextRunAt ?? null,
      job.lastError ?? null,
      job.spoolerJobId ?? null,
      job.updatedAt,
      job.id
    );

    if (status === 'completed') {
      this.cleanupCompletedJobs();
    }
  }

  resetForRetry(job: PrintJob): void {
    this.setStatus(job, 'waiting', {
      attempts: 0,
      lastError: undefined,
      nextRunAt: undefined,
      startedAt: undefined,
      completedAt: undefined,
      spoolerJobId: undefined,
    });
  }

  toSnapshot(job: PrintJob, options: { includeData?: boolean } = {}): PrintJobSnapshot {
    const snapshot: PrintJobSnapshot = {
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
      spoolerJobId: job.spoolerJobId,
    };

    if (options.includeData) {
      snapshot.data = job.data;
    }

    return snapshot;
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        queue_key TEXT NOT NULL,
        printer TEXT NOT NULL,
        printer_name TEXT NOT NULL,
        template TEXT NOT NULL,
        payload_json TEXT,
        buffer BLOB NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        next_run_at INTEGER,
        last_error TEXT,
        spooler_job_id INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_print_jobs_queue_status
        ON print_jobs(queue_key, status, next_run_at, id);
    `);

    this.ensureColumn('print_jobs', 'payload_json', 'TEXT');
    this.resetInterruptedJobs();
    this.cleanupCompletedJobs();
  }

  private ensureColumn(tableName: string, columnName: string, columnDefinition: string): void {
    const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    if (columns.some((column) => column.name === columnName)) return;

    this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }

  private cleanupCompletedJobs(): void {
    const cutoff = new Date(Date.now() - this.completedRetentionHours * MS_PER_HOUR).toISOString();
    const oldJobs = this.db.prepare(`
      DELETE FROM print_jobs
      WHERE status = 'completed'
        AND completed_at IS NOT NULL
        AND completed_at < ?
    `).run(cutoff);

    const overflowJobs = this.db.prepare(`
      DELETE FROM print_jobs
      WHERE status = 'completed'
        AND id NOT IN (
          SELECT id
          FROM print_jobs
          WHERE status = 'completed'
          ORDER BY completed_at DESC, id DESC
          LIMIT ?
        )
    `).run(this.maxCompletedJobs);

    if (Number(oldJobs.changes) > 0 || Number(overflowJobs.changes) > 0) {
      this.db.exec('VACUUM');
    }
  }

  private resetInterruptedJobs(): void {
    this.db.prepare(`
      UPDATE print_jobs
      SET status = 'waiting',
        started_at = NULL,
        completed_at = NULL,
        next_run_at = NULL,
        spooler_job_id = NULL,
        last_error = 'Service restart khi job dang in, dua job ve waiting de xu ly lai',
        updated_at = ?
      WHERE status IN ('printing', 'spooled')
    `).run(new Date().toISOString());
  }

  private rowToJob(row: PrintJobRow): PrintJob {
    return {
      id: row.id,
      queueKey: row.queue_key,
      printer: row.printer,
      printerName: row.printer_name,
      template: row.template,
      data: fromJsonText(row.payload_json),
      buffer: Buffer.from(row.buffer),
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at ?? undefined,
      completedAt: row.completed_at ?? undefined,
      nextRunAt: row.next_run_at ?? undefined,
      lastError: row.last_error ?? undefined,
      spoolerJobId: row.spooler_job_id ?? undefined,
    };
  }
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toJsonText(value: unknown): string | null {
  if (value === undefined) return null;

  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ value: String(value) });
  }
}

function fromJsonText(value: string | null): unknown {
  if (!value) return undefined;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
