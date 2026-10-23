import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createServer } from '../src/server';
import { createInMemoryRepositories } from '@relay/database';
import { RelayGraph } from '@relay/shared';

describe('Phase C - Integrations Dashboard & Execution Engine Integration', () => {
  let relayServer: http.Server;
  let relayBaseUrl: string;
  let repos: ReturnType<typeof createInMemoryRepositories>;

  // Mock external service (e.g. CityPulse API)
  let mockCityPulseServer: http.Server;
  let mockCityPulsePort: number;
  let mockCityPulseBaseUrl: string;
  let receivedRequests: Array<{ method: string; url: string; headers: any; body: any }> = [];

  beforeAll(async () => {
    // 1. Setup mock CityPulse server
    await new Promise<void>((resolve) => {
      mockCityPulseServer = http.createServer((req, res) => {
        let rawBody = '';
        req.on('data', chunk => rawBody += chunk);
        req.on('end', () => {
          let parsedBody = null;
          try {
            parsedBody = JSON.parse(rawBody);
          } catch {
            parsedBody = rawBody;
          }

          receivedRequests.push({
            method: req.method || 'GET',
            url: req.url || '/',
            headers: req.headers,
            body: parsedBody
          });

          // Route handling
          if (req.url === '/health' || req.url === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', service: 'citypulse-mock', version: '2.4.0' }));
          } else if (req.url === '/api/v1/civic/issues') {
            const auth = req.headers['authorization'] || req.headers['x-api-key'];
            if (!auth || (auth !== 'Bearer cp_live_secret_token_123' && auth !== 'cp_live_secret_token_123')) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized', message: 'Invalid CityPulse API token' }));
              return;
            }
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ackId: 'ACK-99412',
              status: 'DISPATCHED_TO_WARD',
              receivedAt: new Date().toISOString()
            }));
          } else if (req.url === '/slow-endpoint') {
            // Delay response to test timeout
            setTimeout(() => {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ delayed: true }));
            }, 1500);
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
          }
        });
      });

      mockCityPulseServer.listen(0, '127.0.0.1', () => {
        const addr = mockCityPulseServer.address() as any;
        mockCityPulsePort = addr.port;
        mockCityPulseBaseUrl = `http://127.0.0.1:${mockCityPulsePort}`;
        resolve();
      });
    });

    // 2. Setup Relay backend
    repos = createInMemoryRepositories();
    const app = createServer(repos);
    relayServer = http.createServer(app);

    await new Promise<void>((resolve) => {
      relayServer.listen(0, '127.0.0.1', () => {
        const addr = relayServer.address() as any;
        relayBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      mockCityPulseServer.close(() => {
        relayServer.close(() => resolve());
      });
    });
  });

  describe('Integration Management API & Validation', () => {
    it('rejects creation when required fields are missing', async () => {
      const res = await fetch(`${relayBaseUrl}/api/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          baseUrl: ''
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects SSRF cloud metadata endpoint targets', async () => {
      const res = await fetch(`${relayBaseUrl}/api/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Malicious Metadata Probe',
          baseUrl: 'http://169.254.169.254/latest/meta-data/'
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_URL');
      expect(data.message).toContain('prohibited');
    });

    it('creates a generic HTTP integration and encrypts secrets', async () => {
      const res = await fetch(`${relayBaseUrl}/api/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'CityPulse Production Gateway',
          appType: 'citypulse',
          baseUrl: mockCityPulseBaseUrl,
          httpMethod: 'POST',
          authType: 'bearer',
          secret: 'cp_live_secret_token_123',
          headers: {
            'X-Relay-Client': 'Relay-Automation'
          },
          timeoutMs: 3000,
          testEndpoint: '/health',
          testMethod: 'GET'
        })
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.integration).toBeDefined();
      expect(data.integration.name).toBe('CityPulse Production Gateway');
      expect(data.integration.hasSecret).toBe(true);
      expect(data.integration.maskedSecret).toBe('••••••••');
      // Must NEVER expose the plaintext secret or raw encryptedAuth in frontend response
      expect(data.integration.secret).toBeUndefined();
      expect(data.integration.encryptedAuth).toBeUndefined();
    });

    it('lists integrations for a project with masked credentials', async () => {
      const res = await fetch(`${relayBaseUrl}/api/integrations?projectId=demo-project-001`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.integrations).toBeInstanceOf(Array);
      expect(data.integrations.length).toBeGreaterThanOrEqual(1);

      const item = data.integrations[0];
      expect(item.hasSecret).toBe(true);
      expect(item.maskedSecret).toBe('••••••••');
      expect(item.encryptedAuth).toBeUndefined();
      expect(item.secret).toBeUndefined();
    });
  });

  describe('Real Connection Testing', () => {
    it('performs live ephemeral connection test against health endpoint', async () => {
      const res = await fetch(`${relayBaseUrl}/api/integrations/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: mockCityPulseBaseUrl,
          testEndpoint: '/health',
          testMethod: 'GET',
          timeoutMs: 3000
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result).toBeDefined();
      expect(data.result.success).toBe(true);
      expect(data.result.statusCode).toBe(200);
      expect(data.result.responseData).toEqual({
        status: 'ok',
        service: 'citypulse-mock',
        version: '2.4.0'
      });
    });

    it('reports failure when test connection endpoint returns 404 or error', async () => {
      const res = await fetch(`${relayBaseUrl}/api/integrations/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: mockCityPulseBaseUrl,
          testEndpoint: '/nonexistent-route',
          testMethod: 'GET'
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result.success).toBe(false);
      expect(data.result.statusCode).toBe(404);
      expect(data.result.message).toContain('HTTP 404');
    });

    it('handles request timeout gracefully during connection test', async () => {
      const res = await fetch(`${relayBaseUrl}/api/integrations/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: mockCityPulseBaseUrl,
          testEndpoint: '/slow-endpoint',
          testMethod: 'GET',
          timeoutMs: 600 // abort before slow response finishes (1500ms)
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result.success).toBe(false);
      expect(data.result.message).toContain('timed out');
    });

    it('tests saved integration using decrypted credentials and updates test status', async () => {
      // 1. Get integration ID
      const listRes = await fetch(`${relayBaseUrl}/api/integrations`);
      const listData = await listRes.json();
      const integrationId = listData.integrations[0].id;

      // 2. Run saved integration test
      const testRes = await fetch(`${relayBaseUrl}/api/integrations/${integrationId}/test`, {
        method: 'POST'
      });

      expect(testRes.status).toBe(200);
      const testData = await testRes.json();
      expect(testData.result.success).toBe(true);
      expect(testData.result.statusCode).toBe(200);

      // 3. Verify that integration record was updated with test status
      const updatedRes = await fetch(`${relayBaseUrl}/api/integrations/${integrationId}`);
      const updatedData = await updatedRes.json();

      expect(updatedData.integration.lastTestStatus).toBe('succeeded');
      expect(updatedData.integration.lastTestedAt).toBeDefined();
      expect(updatedData.integration.lastTestMessage).toContain('HTTP 200');
    });
  });

  describe('Workflow Engine External Integration Invocation', () => {
    it('executes a workflow containing an output node mapped to a configured integration', async () => {
      // 1. Create integration configured for CityPulse civic issues endpoint
      const integRes = await fetch(`${relayBaseUrl}/api/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'CityPulse Issue Dispatcher',
          baseUrl: mockCityPulseBaseUrl,
          httpMethod: 'POST',
          authType: 'bearer',
          secret: 'cp_live_secret_token_123',
          headers: {
            'X-Source': 'Relay-Workflow-Engine'
          },
          timeoutMs: 4000
        })
      });

      const integData = await integRes.json();
      const integrationId = integData.integration.id;

      // 2. Create a workflow graph with Trigger -> Output (destination: integration)
      const graph: RelayGraph = {
        nodes: [
          {
            id: 'node-trig',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: {
              label: 'CityPulse Inbound Webhook',
              type: 'trigger',
              config: {}
            }
          },
          {
            id: 'node-action-output',
            type: 'output',
            position: { x: 300, y: 0 },
            data: {
              label: 'Dispatch Issue to CityPulse',
              type: 'output',
              config: {
                destination: 'integration',
                integrationId,
                endpointPath: '/api/v1/civic/issues'
              }
            }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-trig',
            target: 'node-action-output'
          }
        ]
      };

      await repos.workflows.create({
        id: 'wf-citypulse-integration-test',
        name: 'CityPulse Real Integration Workflow',
        projectId: 'demo-project-001',
        graph
      });

      // 3. Clear received requests before run
      receivedRequests = [];

      // 4. Execute workflow
      const execRes = await fetch(`${relayBaseUrl}/api/workflows/wf-citypulse-integration-test/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            issueId: 'CP-1042',
            category: 'pothole',
            severity: 'high',
            ward: '12'
          }
        })
      });

      expect(execRes.status).toBe(200);
      const execData = await execRes.json();
      expect(execData.summary.status).toBe('succeeded');

      // 5. Verify the external HTTP request was made by Relay engine with decrypted Bearer token
      expect(receivedRequests.length).toBeGreaterThanOrEqual(1);
      const lastReq = receivedRequests[receivedRequests.length - 1];
      expect(lastReq.url).toBe('/api/v1/civic/issues');
      expect(lastReq.headers['authorization']).toBe('Bearer cp_live_secret_token_123');
      expect(lastReq.headers['x-source']).toBe('Relay-Workflow-Engine');
      expect(lastReq.body.issueId).toBe('CP-1042');
      expect(lastReq.body.severity).toBe('high');

      // 6. Verify output step recorded integration response
      const outputStep = execData.summary.steps.find((s: any) => s.nodeId === 'node-action-output');
      expect(outputStep).toBeDefined();
      expect(outputStep.status).toBe('succeeded');
      expect(outputStep.output._integrationResult).toBeDefined();
      expect(outputStep.output._integrationResult.success).toBe(true);
      expect(outputStep.output._integrationResult.data.ackId).toBe('ACK-99412');
      expect(outputStep.output._integrationResult.data.status).toBe('DISPATCHED_TO_WARD');
    });

    it('marks output node as failed if external integration call fails (e.g. 401 unauthorized)', async () => {
      // 1. Create integration with wrong secret
      const integRes = await fetch(`${relayBaseUrl}/api/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'CityPulse Invalid Secret Integration',
          baseUrl: mockCityPulseBaseUrl,
          httpMethod: 'POST',
          authType: 'bearer',
          secret: 'invalid_secret_token',
          timeoutMs: 4000
        })
      });

      const integData = await integRes.json();
      const badIntegrationId = integData.integration.id;

      const graph: RelayGraph = {
        nodes: [
          {
            id: 'node-trig-bad',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { label: 'Trigger', type: 'trigger', config: {} }
          },
          {
            id: 'node-out-bad',
            type: 'output',
            position: { x: 300, y: 0 },
            data: {
              label: 'Dispatch Bad Token',
              type: 'output',
              config: {
                destination: 'integration',
                integrationId: badIntegrationId,
                endpointPath: '/api/v1/civic/issues'
              }
            }
          }
        ],
        edges: [
          { id: 'edge-bad', source: 'node-trig-bad', target: 'node-out-bad' }
        ]
      };

      await repos.workflows.create({
        id: 'wf-citypulse-bad-token-test',
        name: 'CityPulse Bad Token Test',
        projectId: 'demo-project-001',
        graph
      });

      // Execute workflow
      const execRes = await fetch(`${relayBaseUrl}/api/workflows/wf-citypulse-bad-token-test/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { issueId: 'CP-FAIL' } })
      });

      expect(execRes.status).toBe(200);
      const execData = await execRes.json();
      expect(execData.summary.status).toBe('failed');

      const failedStep = execData.summary.steps.find((s: any) => s.nodeId === 'node-out-bad');
      expect(failedStep.status).toBe('failed');
      expect(failedStep.errorMessage).toContain('401');
    });
  });
});
