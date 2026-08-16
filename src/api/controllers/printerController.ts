import { Request, Response, NextFunction } from 'express';
import { printerService } from '../../printer/services/printerService';

export const getPrinters = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const printers = await printerService.listPrinters();
    res.json(printers);
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
