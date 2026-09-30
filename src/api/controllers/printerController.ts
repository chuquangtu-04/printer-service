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

export const testLanPrinter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const host = requiredIPv4(req.body?.host, 'host');
    const port = optionalPort(req.body?.port);

    const result = await printerService.testLanPrinter({ host, port });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const saveLanPrinter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = requiredPrinterId(req.body?.id);
    const name = requiredString(req.body?.name, 'name');
    const host = requiredIPv4(req.body?.host, 'host');
    const port = optionalPort(req.body?.port);

    const result = printerService.saveLanPrinter({ id, name, host, port });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const updateLanPrinterName = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = requiredPrinterId(req.params.id);
    const name = requiredString(req.body?.name, 'name');

    const result = printerService.updateLanPrinterName({ id, name });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const deleteLanPrinter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = requiredPrinterId(req.params.id);

    const result = printerService.deleteLanPrinter(id);
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

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`Thieu hoac sai kieu field "${field}"`);
  }

  return value.trim();
}

function requiredPrinterId(value: unknown): string {
  const id = requiredString(value, 'id');
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new ValidationError('Field "id" chi duoc gom chu cai, so, gach ngang va gach duoi');
  }

  return id;
}

function requiredIPv4(value: unknown, field: string): string {
  const ip = requiredString(value, field);
  const parts = ip.split('.');
  const valid = parts.length === 4 && parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const octet = Number(part);
    return octet >= 0 && octet <= 255;
  });

  if (!valid) {
    throw new ValidationError(`Field "${field}" phai la IPv4 hop le`);
  }

  return ip;
}

function optionalPort(value: unknown): number {
  if (value === undefined || value === null || value === '') return 9100;

  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.trim())
      : NaN;

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new ValidationError('Field "port" phai la so nguyen duong tu 1 den 65535');
  }

  return parsed;
}
