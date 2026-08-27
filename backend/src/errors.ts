import { ValidationDetail } from './services/validators';

/** Thrown by services; caught by the error-handling middleware and turned into the standard error body. */
export class HttpError extends Error {
  status: number;
  code: string;
  details?: ValidationDetail[];

  constructor(status: number, code: string, message: string, details?: ValidationDetail[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function validationError(details: ValidationDetail[], message = 'Validation failed'): HttpError {
  return new HttpError(400, 'VALIDATION_FAILED', message, details);
}

export function notFoundError(message = 'Resource not found'): HttpError {
  return new HttpError(404, 'NOT_FOUND', message);
}

export function duplicateNameError(message = 'Name already exists'): HttpError {
  return new HttpError(409, 'DUPLICATE_NAME', message);
}

export function inUseError(message = 'Resource is in use and cannot be deleted'): HttpError {
  return new HttpError(409, 'IN_USE', message);
}
