import { NextFunction, Request, RequestHandler, Response } from 'express';

/** Wraps an async route handler so a rejected promise reaches Express's error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
