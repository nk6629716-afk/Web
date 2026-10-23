import { Response } from 'express';

export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: string, message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Missing or invalid authentication credentials', code = 'UNAUTHORIZED', details?: any) {
    super(code, message, 401, details);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Insufficient permissions or access denied to requested resource', code = 'FORBIDDEN', details?: any) {
    super(code, message, 403, details);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource', code = 'NOT_FOUND') {
    super(code, `${resource} not found`, 404);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, code = 'CONFLICT', details?: any) {
    super(code, message, 409, details);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any, code = 'VALIDATION_ERROR') {
    super(code, message, 422, details);
  }
}

export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests, please try again later', code = 'RATE_LIMIT_EXCEEDED') {
    super(code, message, 429);
  }
}

export function sendApiError(res: Response, error: any, requestId?: string) {
  const statusCode = error instanceof ApiError ? error.statusCode : (error.statusCode || error.status || 500);
  const code = error instanceof ApiError ? error.code : (error.code || 'INTERNAL_SERVER_ERROR');
  const message = error.message || 'An unexpected error occurred';
  const details = error instanceof ApiError ? error.details : undefined;

  const payload: any = {
    error: {
      code,
      message,
      ...(requestId ? { requestId } : {}),
      ...(details ? { details } : {})
    }
  };

  return res.status(statusCode).json(payload);
}
