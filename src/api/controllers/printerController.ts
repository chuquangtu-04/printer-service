import { Request, Response, NextFunction } from 'express';
import { printerService } from '@/printer/services/printerService';

const isPrinterNotFoundError = (err: unknown): err is Error => {
  if (!(err instanceof Error)) return false;
  return err.message.startsWith('Không tìm thấy máy in') || err.message.startsWith('KhÃ´ng tÃ¬m tháº¥y mÃ¡y in');
};

export const getPrinters = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const printers = await printerService.listPrinters();
    res.json(printers);
  } catch (err) {
    next(err);
  }
};

export const getPrinterStatuses = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const statuses = await printerService.getPrinterStatuses();
    res.json(statuses);
  } catch (err) {
    next(err);
  }
};

export const testPrint = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { printerId } = req.body;
    if (!printerId) {
      res.status(400).json({ success: false, message: 'Thiếu printerId' });
      return;
    }

    const result = await printerService.testPrint(printerId);
    res.json(result);
  } catch (err: unknown) {
    if (isPrinterNotFoundError(err)) {
      res.status(404).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};
