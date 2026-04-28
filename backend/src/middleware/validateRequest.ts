import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { validationError } from '../utils/responseHelper.ts';

function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    validationError(
      res,
      errors.array().map((e) => ({ field: e.type === 'field' ? (e as { path: string }).path : 'unknown', message: e.msg as string })),
    );
    return;
  }
  next();
}

export default validateRequest;
