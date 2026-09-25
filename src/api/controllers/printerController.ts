import { Request, Response, NextFunction } from 'express';
import { printerService } from '../services/printer';
import { ValidationError } from '../../common/errors';

const MAX_DISCOVERY_CONCURRENCY = 200;
const MAX_DISCOVERY_TIMEOUT_MS = 5000;

export const getPrinters = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const printers = await printerService.listPrinters();
    res.json(printers);
  } catch (err) {
    next(err);
  }
};

export const discoverLanPrinters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await printerService.discoverLanPrinters({
      subnetIp: optionalString(req.query.subnetIp),
      netmask: optionalString(req.query.netmask),
      concurrency: optionalPositiveInteger(req.query.concurrency, 'concurrency', MAX_DISCOVERY_CONCURRENCY),
      timeoutMs: optionalPositiveInteger(req.query.timeoutMs, 'timeoutMs', MAX_DISCOVERY_TIMEOUT_MS),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const testPrint = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { printerId } = req.body;
    if (!printerId) {
      res.status(400).json({ success: false, message: 'Thieu printerId' });
      return;
    }

    const result = await printerService.testPrint(printerId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

function optionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return optionalString(value[0]);
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value.trim();
}

function optionalPositiveInteger(value: unknown, field: string, max: number): number | undefined {
  const text = optionalString(value);
  if (text === undefined) return undefined;

  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > max) {
    throw new ValidationError(`Field "${field}" phai la so nguyen duong <= ${max}`);
  }

  return parsed;
}
