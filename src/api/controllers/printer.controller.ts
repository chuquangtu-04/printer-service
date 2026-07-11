import { Request, Response, NextFunction } from 'express';
import { printerService } from '@/printer/services/printer.service';

export const getPrinters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      res.status(400).json({ success: false, message: 'Thiếu printerId' });
      return;
    }
    const result = await printerService.testPrint(printerId);
    res.json(result);
  } catch (err: any) {
    if (err.message?.startsWith('Không tìm thấy máy in')) {
      res.status(404).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};
