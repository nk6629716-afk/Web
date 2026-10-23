import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { IRepositories } from '@relay/database';
import { ApiKeyScope } from '@relay/shared';
import { UnauthorizedError, ForbiddenError } from './errors';

export function requireApiKeyAuth(repos: IRepositories, requiredScopes: ApiKeyScope[] = []) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedError('Missing Authorization header. Use Bearer <token>');
      }

      const match = authHeader.match(/^Bearer\s+([a-zA-Z0-9_]+)$/);
      if (!match) {
        throw new UnauthorizedError('Malformed Authorization header. Format: Bearer rl_live_...');
      }

      const token = match[1];
      if (!token.startsWith('rl_live_') || token.length < 24) {
        throw new UnauthorizedError('Invalid API key format');
      }

      const keyPrefix = token.substring(0, 16);
      const secretHash = crypto.createHash('sha256').update(token).digest('hex');

      const apiKey = await repos.apiKeys.findByKeyPrefix(keyPrefix);
      if (!apiKey) {
        throw new UnauthorizedError('Invalid or revoked API key');
      }

      // Timing-safe secret hash comparison
      const expectedHashBuffer = Buffer.from(apiKey.secretHash, 'hex');
      const providedHashBuffer = Buffer.from(secretHash, 'hex');

      if (
        expectedHashBuffer.length !== providedHashBuffer.length ||
        !crypto.timingSafeEqual(expectedHashBuffer, providedHashBuffer)
      ) {
        throw new UnauthorizedError('Invalid API key credentials');
      }

      // Check revocation
      if (apiKey.revokedAt) {
        throw new UnauthorizedError('This API key has been revoked');
      }

      // Check expiry
      if (apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() <= Date.now()) {
        throw new UnauthorizedError('This API key has expired');
      }

      // Check scopes
      if (requiredScopes.length > 0) {
        const missingScopes = requiredScopes.filter(scope => !apiKey.scopes.includes(scope));
        if (missingScopes.length > 0) {
          throw new ForbiddenError(
            `This API key lacks required scope(s): ${missingScopes.join(', ')}`,
            'INSUFFICIENT_PERMISSIONS',
            { required: requiredScopes, granted: apiKey.scopes }
          );
        }
      }

      // Attach context to request
      req.apiKey = apiKey;
      req.projectId = apiKey.projectId;

      // Update last_used_at in background
      repos.apiKeys.updateLastUsed(apiKey.id).catch((err) => {
        console.warn('Failed to update apiKey lastUsedAt:', err?.message);
      });

      next();
    } catch (err) {
      next(err);
    }
  };
}
