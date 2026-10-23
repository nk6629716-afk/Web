import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { RateLimitError } from './errors';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      apiKey?: any;
      projectId?: string;
    }
  }
}

// Simple sliding window rate limiter
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function requestContextMiddleware(options: { maxRequestsPerMinute?: number } = {}) {
  const maxRequests = options.maxRequestsPerMinute || 120;
  const windowMs = 60 * 1000;

  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Assign or propagate Request ID
    const incomingRequestId = req.headers['x-request-id'];
    const requestId = typeof incomingRequestId === 'string' && incomingRequestId.trim()
      ? incomingRequestId.trim()
      : `req_${crypto.randomBytes(12).toString('hex')}`;

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    // 2. Sliding window rate limit
    const clientKey = req.ip || (req.headers['x-forwarded-for'] as string) || 'default';
    const now = Date.now();
    let bucket = rateLimitBuckets.get(clientKey);

    if (!bucket || now > bucket.resetAt) {
      bucket = {
        count: 1,
        resetAt: now + windowMs
      };
      rateLimitBuckets.set(clientKey, bucket);
    } else {
      bucket.count += 1;
      if (bucket.count > maxRequests) {
        res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
        return next(new RateLimitError(`Rate limit exceeded (${maxRequests} requests/min). Please retry after ${Math.ceil((bucket.resetAt - now) / 1000)}s`));
      }
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - bucket.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

    next();
  };
}
