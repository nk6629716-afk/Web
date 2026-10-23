import { Router, Request, Response, NextFunction } from 'express';
import { IRepositories } from '@relay/database';
import { ApiKeyScope } from '@relay/shared';
import { ValidationError, NotFoundError, ForbiddenError } from './errors';

const VALID_SCOPES: ApiKeyScope[] = [
  'workflows:read',
  'workflows:execute',
  'executions:read',
  'webhooks:manage'
];

export function createApiKeyRouter(repos: IRepositories): Router {
  const router = Router();

  // POST /api/v1/api-keys - Create a new API Key
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, projectId, scopes, expiresAt } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new ValidationError('A non-empty "name" string is required for the API key');
      }

      if (!projectId || typeof projectId !== 'string') {
        throw new ValidationError('A valid "projectId" is required');
      }

      // Verify project exists
      const project = await repos.projects.getById(projectId);
      if (!project) {
        throw new NotFoundError(`Project "${projectId}"`);
      }

      const assignedScopes: ApiKeyScope[] = Array.isArray(scopes) && scopes.length > 0
        ? scopes
        : ['workflows:read'];

      // Validate scopes
      for (const scope of assignedScopes) {
        if (!VALID_SCOPES.includes(scope)) {
          throw new ValidationError(`Invalid scope "${scope}". Allowed scopes: ${VALID_SCOPES.join(', ')}`);
        }
      }

      // Validate expiration if provided
      if (expiresAt) {
        const expDate = new Date(expiresAt);
        if (isNaN(expDate.getTime()) || expDate.getTime() <= Date.now()) {
          throw new ValidationError('"expiresAt" must be a valid future ISO timestamp');
        }
      }

      const result = await repos.apiKeys.create({
        name: name.trim(),
        projectId,
        scopes: assignedScopes,
        expiresAt
      });

      // Never expose secret_hash; plaintextToken returned ONLY on creation
      const { secretHash, ...safeKeyMetadata } = result.apiKey;

      res.status(201).json({
        apiKey: safeKeyMetadata,
        plaintextToken: result.plaintextToken,
        warning: 'Store this plaintext token securely. It cannot be retrieved again.'
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/api-keys - List API keys for a project (safe metadata only)
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = (req.query.projectId as string) || req.projectId;
      if (!projectId) {
        throw new ValidationError('Query parameter "projectId" is required');
      }

      const keys = await repos.apiKeys.listByProject(projectId);
      const safeKeys = keys.map(({ secretHash, ...safe }) => safe);

      res.json({ apiKeys: safeKeys });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/v1/api-keys/:id - Revoke an API key
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const projectId = (req.query.projectId as string) || req.body?.projectId || req.projectId;

      if (!projectId) {
        throw new ValidationError('Parameter "projectId" is required to revoke an API key');
      }

      const revoked = await repos.apiKeys.revoke(id, projectId);
      if (!revoked) {
        throw new NotFoundError(`API key "${id}" for project "${projectId}"`);
      }

      res.json({
        success: true,
        message: `API key "${id}" has been revoked successfully`
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
