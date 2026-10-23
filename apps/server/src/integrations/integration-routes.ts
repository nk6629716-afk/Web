import { Router, Request, Response, NextFunction } from 'express';
import { IRepositories } from '@relay/database';
import { 
  AppIntegration, 
  AppIntegrationSafeResponse, 
  TestConnectionResult 
} from '@relay/shared';
import { 
  dispatchHttpRequest, 
  toSafeIntegrationResponse, 
  validateUrlForSsrf 
} from './http-dispatcher';

export function createIntegrationRouter(repos: IRepositories): Router {
  const router = Router();

  // GET /api/integrations - List integrations for project
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = (req.query.projectId as string) || (req as any).projectId || 'demo-project-001';
      const list = await repos.integrations.listByProject(projectId);
      const safeIntegrations = list.map(toSafeIntegrationResponse);
      res.json({ integrations: safeIntegrations });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/integrations/test - Ephemeral connection test before saving
  router.post('/test', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        baseUrl,
        httpMethod = 'POST',
        authType = 'none',
        secret,
        authHeaderName,
        headers = {},
        timeoutMs = 5000,
        testEndpoint,
        testMethod = 'GET'
      } = req.body;

      if (!baseUrl || typeof baseUrl !== 'string') {
        return res.status(400).json({ 
          code: 'VALIDATION_ERROR', 
          message: 'Base URL is required' 
        });
      }

      const urlValidation = validateUrlForSsrf(baseUrl);
      if (!urlValidation.valid) {
        return res.status(400).json({
          code: 'INVALID_URL',
          message: urlValidation.error
        });
      }

      // Determine test target URL
      let targetUrl = baseUrl.trim();
      if (testEndpoint && typeof testEndpoint === 'string' && testEndpoint.trim()) {
        const cleanEndpoint = testEndpoint.trim();
        targetUrl = `${targetUrl.replace(/\/$/, '')}/${cleanEndpoint.replace(/^\//, '')}`;
      }

      const methodToUse = (testEndpoint && testMethod) ? testMethod : httpMethod;

      const result = await dispatchHttpRequest({
        url: targetUrl,
        method: methodToUse,
        headers,
        authType,
        secret,
        authHeaderName,
        timeoutMs
      });

      const testResult: TestConnectionResult = {
        success: result.success,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        message: result.message,
        responseData: result.data
      };

      res.json({ result: testResult });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/integrations - Create an integration
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        appType = 'generic_http',
        baseUrl,
        httpMethod = 'POST',
        authType = 'none',
        secret,
        authHeaderName,
        headers = {},
        timeoutMs = 5000,
        testEndpoint,
        testMethod = 'GET',
        projectId = (req as any).projectId || 'demo-project-001'
      } = req.body;

      // Validation
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Integration name is required' });
      }
      if (!baseUrl || typeof baseUrl !== 'string' || !baseUrl.trim()) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Base URL is required' });
      }

      const urlValidation = validateUrlForSsrf(baseUrl);
      if (!urlValidation.valid) {
        return res.status(400).json({ code: 'INVALID_URL', message: urlValidation.error });
      }

      const created = await repos.integrations.create({
        projectId,
        name: name.trim(),
        appType,
        baseUrl: baseUrl.trim(),
        httpMethod: (httpMethod || 'POST').toUpperCase() as any,
        authType,
        secret,
        authHeaderName,
        headers,
        timeoutMs: Math.max(500, Math.min(Number(timeoutMs) || 5000, 30000)),
        testEndpoint: testEndpoint ? testEndpoint.trim() : undefined,
        testMethod: testMethod ? testMethod.toUpperCase() : 'GET',
        status: 'active'
      });

      res.status(201).json({ integration: toSafeIntegrationResponse(created) });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/integrations/:id - Get integration by id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const integration = await repos.integrations.getById(id);
      if (!integration) {
        return res.status(404).json({ code: 'INTEGRATION_NOT_FOUND', message: `Integration "${id}" not found` });
      }
      res.json({ integration: toSafeIntegrationResponse(integration) });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/integrations/:id - Update integration
  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const existing = await repos.integrations.getById(id);
      if (!existing) {
        return res.status(404).json({ code: 'INTEGRATION_NOT_FOUND', message: `Integration "${id}" not found` });
      }

      const updates: any = {};
      if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
      if (req.body.appType !== undefined) updates.appType = req.body.appType;
      if (req.body.baseUrl !== undefined) {
        const val = validateUrlForSsrf(req.body.baseUrl);
        if (!val.valid) {
          return res.status(400).json({ code: 'INVALID_URL', message: val.error });
        }
        updates.baseUrl = String(req.body.baseUrl).trim();
      }
      if (req.body.httpMethod !== undefined) updates.httpMethod = req.body.httpMethod.toUpperCase();
      if (req.body.authType !== undefined) updates.authType = req.body.authType;
      if (req.body.secret !== undefined) updates.secret = req.body.secret;
      if (req.body.authHeaderName !== undefined) updates.authHeaderName = req.body.authHeaderName;
      if (req.body.headers !== undefined) updates.headers = req.body.headers;
      if (req.body.timeoutMs !== undefined) updates.timeoutMs = Math.max(500, Math.min(Number(req.body.timeoutMs) || 5000, 30000));
      if (req.body.testEndpoint !== undefined) updates.testEndpoint = req.body.testEndpoint;
      if (req.body.testMethod !== undefined) updates.testMethod = req.body.testMethod.toUpperCase();
      if (req.body.status !== undefined) updates.status = req.body.status;

      const updated = await repos.integrations.update(id, updates);
      res.json({ integration: toSafeIntegrationResponse(updated) });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/integrations/:id - Delete integration
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const existing = await repos.integrations.getById(id);
      if (!existing) {
        return res.status(404).json({ code: 'INTEGRATION_NOT_FOUND', message: `Integration "${id}" not found` });
      }

      const projectId = (req.query.projectId as string) || (req as any).projectId || existing.projectId;
      const deleted = await repos.integrations.delete(id, projectId);
      res.json({ success: deleted });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/integrations/:id/test - Test saved integration
  router.post('/:id/test', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const integration = await repos.integrations.getById(id);
      if (!integration) {
        return res.status(404).json({ code: 'INTEGRATION_NOT_FOUND', message: `Integration "${id}" not found` });
      }

      // Retrieve decrypted secret
      const secret = await repos.integrations.getDecryptedSecret(id);

      // Determine test target URL
      let targetUrl = integration.baseUrl.trim();
      if (integration.testEndpoint && integration.testEndpoint.trim()) {
        const cleanEndpoint = integration.testEndpoint.trim();
        targetUrl = `${targetUrl.replace(/\/$/, '')}/${cleanEndpoint.replace(/^\//, '')}`;
      }

      const methodToUse = (integration.testEndpoint && integration.testMethod) ? integration.testMethod : integration.httpMethod;

      const result = await dispatchHttpRequest({
        url: targetUrl,
        method: methodToUse,
        headers: integration.headers,
        authType: integration.authType,
        secret,
        authHeaderName: integration.authHeaderName,
        timeoutMs: integration.timeoutMs
      });

      // Update integration test status in repository
      await repos.integrations.update(id, {
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: result.success ? 'succeeded' : 'failed',
        lastTestMessage: result.message
      });

      const testResult: TestConnectionResult = {
        success: result.success,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        message: result.message,
        responseData: result.data
      };

      res.json({ result: testResult });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/**
 * Creates an integration invoker callback to be passed to the workflow engine.
 */
export function createIntegrationInvoker(repos: IRepositories) {
  return async (integrationId: string, payload: Record<string, any>, config?: Record<string, any>) => {
    const integration = await repos.integrations.getById(integrationId);
    if (!integration) {
      throw new Error(`Configured integration "${integrationId}" was not found`);
    }

    const secret = await repos.integrations.getDecryptedSecret(integrationId);

    // Compute target URL
    let targetUrl = integration.baseUrl.trim();
    if (config?.endpointPath && typeof config.endpointPath === 'string' && config.endpointPath.trim()) {
      const cleanPath = config.endpointPath.trim();
      targetUrl = `${targetUrl.replace(/\/$/, '')}/${cleanPath.replace(/^\//, '')}`;
    }

    const method = (config?.httpMethod || integration.httpMethod || 'POST').toUpperCase();
    const mergedHeaders = {
      ...(integration.headers || {}),
      ...(config?.headers || {})
    };

    const result = await dispatchHttpRequest({
      url: targetUrl,
      method,
      headers: mergedHeaders,
      authType: integration.authType,
      secret,
      authHeaderName: integration.authHeaderName,
      body: payload,
      timeoutMs: config?.timeoutMs || integration.timeoutMs || 5000
    });

    if (!result.success) {
      throw new Error(`Integration [${integration.name}] request failed: ${result.message}`);
    }

    return {
      success: true,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
      data: result.data
    };
  };
}
