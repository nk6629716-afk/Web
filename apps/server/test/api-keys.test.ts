import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express, { Request, Response } from 'express';
import { createServer } from '../src/server';
import { getRepositories } from '@relay/database';
import { requireApiKeyAuth } from '../src/integrations';

describe('Relay Public API Key & Authentication Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let repos = getRepositories();

  beforeAll(async () => {
    repos = getRepositories();
    const app = createServer(repos, {
      configure: (_app, v1Router) => {
        // Mount test protected endpoint to verify requireApiKeyAuth middleware
        v1Router.get('/test-protected-read', requireApiKeyAuth(repos, ['workflows:read']), (req: Request, res: Response) => {
          res.json({
            ok: true,
            projectId: req.projectId,
            apiKeyId: req.apiKey.id
          });
        });

        v1Router.get('/test-protected-execute', requireApiKeyAuth(repos, ['workflows:execute']), (req: Request, res: Response) => {
          res.json({
            ok: true,
            projectId: req.projectId,
            apiKeyId: req.apiKey.id
          });
        });
      }
    });

    server = http.createServer(app);


    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('POST /api/v1/api-keys validates required parameters', async () => {
    const res = await fetch(`${baseUrl}/api/v1/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(res.headers.get('x-request-id')).toBeDefined();
  });

  it('POST /api/v1/api-keys creates key, returns plaintext token once and safe metadata', async () => {
    const res = await fetch(`${baseUrl}/api/v1/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Zapier Production Integration',
        projectId: 'demo-project-001',
        scopes: ['workflows:read', 'workflows:execute']
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.plaintextToken).toBeDefined();
    expect(data.plaintextToken.startsWith('rl_live_')).toBe(true);
    expect(data.apiKey.id).toBeDefined();
    expect(data.apiKey.name).toBe('Zapier Production Integration');
    expect(data.apiKey.keyPrefix).toBe(data.plaintextToken.substring(0, 16));
    expect(data.apiKey.secretHash).toBeUndefined(); // Never exposed
    expect(data.apiKey.scopes).toEqual(['workflows:read', 'workflows:execute']);
  });

  it('GET /api/v1/api-keys lists keys without exposing secrets or hashes', async () => {
    const res = await fetch(`${baseUrl}/api/v1/api-keys?projectId=demo-project-001`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.apiKeys)).toBe(true);
    expect(data.apiKeys.length).toBeGreaterThan(0);
    for (const key of data.apiKeys) {
      expect(key.keyPrefix).toBeDefined();
      expect(key.secretHash).toBeUndefined();
      expect(key.plaintextToken).toBeUndefined();
    }
  });

  it('DELETE /api/v1/api-keys/:id revokes the key', async () => {
    // Create key to revoke
    const createRes = await fetch(`${baseUrl}/api/v1/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Temporary Key to Revoke',
        projectId: 'demo-project-001',
        scopes: ['workflows:read']
      })
    });
    const { apiKey, plaintextToken } = await createRes.json();

    // Revoke key
    const delRes = await fetch(`${baseUrl}/api/v1/api-keys/${apiKey.id}?projectId=demo-project-001`, {
      method: 'DELETE'
    });
    expect(delRes.status).toBe(200);
    const delData = await delRes.json();
    expect(delData.success).toBe(true);

    // Attempting to access protected endpoint with revoked key must fail with 401
    const authRes = await fetch(`${baseUrl}/api/v1/test-protected-read`, {
      headers: { Authorization: `Bearer ${plaintextToken}` }
    });
    expect(authRes.status).toBe(401);
    const authData = await authRes.json();
    expect(authData.error.code).toBe('UNAUTHORIZED');
  });

  it('requireApiKeyAuth rejects requests with missing or malformed Authorization header', async () => {
    const resNoAuth = await fetch(`${baseUrl}/api/v1/test-protected-read`);
    expect(resNoAuth.status).toBe(401);
    const dataNoAuth = await resNoAuth.json();
    expect(dataNoAuth.error.code).toBe('UNAUTHORIZED');

    const resMalformed = await fetch(`${baseUrl}/api/v1/test-protected-read`, {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' }
    });
    expect(resMalformed.status).toBe(401);
  });

  it('requireApiKeyAuth rejects fake or altered tokens', async () => {
    const res = await fetch(`${baseUrl}/api/v1/test-protected-read`, {
      headers: { Authorization: 'Bearer rl_live_fakefakefakefakefakefake123' }
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('requireApiKeyAuth enforces scope permissions (403 on missing scope)', async () => {
    // Create read-only key
    const createRes = await fetch(`${baseUrl}/api/v1/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Read Only Key',
        projectId: 'demo-project-001',
        scopes: ['workflows:read']
      })
    });
    const { plaintextToken } = await createRes.json();

    // Accessing read endpoint succeeds
    const readRes = await fetch(`${baseUrl}/api/v1/test-protected-read`, {
      headers: { Authorization: `Bearer ${plaintextToken}` }
    });
    expect(readRes.status).toBe(200);
    const readData = await readRes.json();
    expect(readData.ok).toBe(true);
    expect(readData.projectId).toBe('demo-project-001');

    // Accessing execute endpoint fails with 403 Forbidden
    const execRes = await fetch(`${baseUrl}/api/v1/test-protected-execute`, {
      headers: { Authorization: `Bearer ${plaintextToken}` }
    });
    expect(execRes.status).toBe(403);
    const execData = await execRes.json();
    expect(execData.error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  it('requireApiKeyAuth rejects expired keys', async () => {
    // Create expired key (1 millisecond in future and wait or directly created expired)
    const createRes = await repos.apiKeys.create({
      name: 'Expired Key',
      projectId: 'demo-project-001',
      scopes: ['workflows:read'],
      expiresAt: new Date(Date.now() - 10000).toISOString()
    });

    const res = await fetch(`${baseUrl}/api/v1/test-protected-read`, {
      headers: { Authorization: `Bearer ${createRes.plaintextToken}` }
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.message).toContain('expired');
  });
});
