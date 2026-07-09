import { Request, Response, NextFunction } from 'express';
import { printerService } from '../../printer/services/printer.service';

export const getPrinters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const printers = await printerService.listPrinters();
    res.json(printers);
  } catch (err) {
    next(err);
  }
};
