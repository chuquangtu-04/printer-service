import { Request, Response, NextFunction } from 'express';
import printService from '../services/print';
import { ValidationError } from '../../common/errors';

export async function print(req: Request, res: Response, next: NextFunction) {
  try {
    const { printer, categoryId, template, data, ...payload } = req.body ?? {};

    if (printer !== undefined && typeof printer !== 'string') {
      throw new ValidationError('Sai kieu field "printer"');
    }
    if (categoryId !== undefined && typeof categoryId !== 'string') {
      throw new ValidationError('Sai kieu field "categoryId"');
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

    const result = await printService.print({ printer, categoryId, template, data: printData });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
