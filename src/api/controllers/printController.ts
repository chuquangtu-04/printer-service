import { Request, Response, NextFunction } from 'express';
import printService from '../services/print';
import { ValidationError } from '../../common/errors';

export async function print(req: Request, res: Response, next: NextFunction) {
  try {
    const { printer, template, data, ...payload } = req.body ?? {};

    if (!printer || typeof printer !== 'string') {
      throw new ValidationError('Thieu hoac sai kieu field "printer"');
    }
    if (!template || typeof template !== 'string') {
      throw new ValidationError('Thieu hoac sai kieu field "template"');
    }
    if (data !== undefined && typeof data !== 'object') {
      throw new ValidationError('Sai kieu field "data"');
    }

    const printData = data ?? payload;
    if (!printData || typeof printData !== 'object') {
      throw new ValidationError('Thieu du lieu in');
    }

    const result = await printService.print({ printer, template, data: printData });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
