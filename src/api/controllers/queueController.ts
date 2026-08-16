import { Request, Response, NextFunction } from 'express';
import printService from '../services/PrintService';
import { ValidationError } from '../../common/errors';

export const getQueue = (_req: Request, res: Response, next: NextFunction): void => {
  try {
    res.json(printService.listQueue());
  } catch (err) {
    next(err);
  }
};

export const clearQueue = (_req: Request, res: Response, next: NextFunction): void => {
  try {
    res.json(printService.clearQueue());
  } catch (err) {
    next(err);
  }
};

export const retryQueue = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const rawId = req.body?.id ?? req.body?.jobId;
    const jobId = rawId === undefined ? undefined : Number(rawId);

    if (jobId !== undefined && (!Number.isInteger(jobId) || jobId <= 0)) {
      throw new ValidationError('Field "id" phai la so nguyen duong');
    }

    const jobs = printService.retryQueue(jobId);
    res.json({
      success: true,
      retried: jobs.length,
      jobs,
    });
  } catch (err) {
    next(err);
  }
};
