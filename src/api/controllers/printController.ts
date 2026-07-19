import { Request, Response, NextFunction } from 'express';
import printService from '../../printer/services/PrintService';
import { ValidationError } from '../../common/errors';

export async function print(req: Request, res: Response, next: NextFunction) {
  try {
    const { printer, template, data } = req.body ?? {};

    if (!printer || typeof printer !== 'string') {
      throw new ValidationError('Thiếu hoặc sai kiểu field "printer"');
    }
    if (!template || typeof template !== 'string') {
      throw new ValidationError('Thiếu hoặc sai kiểu field "template"');
    }
    if (data === undefined || typeof data !== 'object') {
      throw new ValidationError('Thiếu hoặc sai kiểu field "data"');
    }

    const result = await printService.print({ printer, template, data });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
