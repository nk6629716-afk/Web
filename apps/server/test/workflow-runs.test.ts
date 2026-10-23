import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createServer } from '../src/server';
import { getRepositories, IRepositories } from '@relay/database';
import { SEEDED_SAMPLE_WORKFLOW, Workflow } from '@relay/shared';

describe('POST /api/v1/workflows/:id/runs Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let repos: IRepositories;

  let executeToken: string;
  let readOnlyToken: string;
  let otherProjectToken: string;

  const testProjectId = 'proj-citypulse-001';
  const otherProjectId = 'proj-other-002';
  let testWorkflow: Workflow;
  let otherProjectWorkflow: Workflow;
  let invalidGraphWorkflow: Workflow;
  let failingNodeWorkflow: Workflow;

  beforeAll(async () => {
    repos = getRepositories();
    const app = createServer(repos);
    server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // 1. Create test projects
    await repos.projects.create({ name: 'CityPulse Integration Project' });
    // Manually ensure project with testProjectId exists in repo
    const proj1 = await repos.projects.create({ name: 'CityPulse Core' });
    // In our test, use the created project IDs
    const projectIdA = proj1.id;
    const proj2 = await repos.projects.create({ name: 'Other Department' });
    const projectIdB = proj2.id;

    // 2. Create API keys
    const keyExec = await repos.apiKeys.create({
      name: 'CityPulse Run Key',
      projectId: projectIdA,
      scopes: ['workflows:execute', 'workflows:read', 'executions:read']
    });
    executeToken = keyExec.plaintextToken;

    const keyRead = await repos.apiKeys.create({
      name: 'Read Only Key',
      projectId: projectIdA,
      scopes: ['workflows:read', 'executions:read'] // Missing workflows:execute
    });
    readOnlyToken = keyRead.plaintextToken;

    const keyOther = await repos.apiKeys.create({
      name: 'Other Project Key',
      projectId: projectIdB,
      scopes: ['workflows:execute', 'workflows:read']
    });
    otherProjectToken = keyOther.plaintextToken;

    // 3. Create test workflows
    // Workflow A (CityPulse Ticket Router): trigger -> condition (severity == high) -> true: vip-output / false: standard-output
    testWorkflow = await repos.workflows.create({
      id: `wf-cp-${Date.now()}`,
      projectId: projectIdA,
      name: 'CityPulse Civic Incident Triage',
      graph: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Incident Webhook', config: {} }
          },
          {
            id: 'condition-severity',
            type: 'condition',
            position: { x: 300, y: 100 },
            data: {
              label: 'Check High Severity',
              config: {
                fieldPath: 'severity',
                operator: 'equals',
                targetValue: 'high'
              }
            }
          },
          {
            id: 'output-high',
            type: 'output',
            position: { x: 550, y: 50 },
            data: { label: 'Emergency Dispatch', config: { actionType: 'AUTO_APPROVE' } }
          },
          {
            id: 'output-normal',
            type: 'output',
            position: { x: 550, y: 200 },
            data: { label: 'Standard Queue', config: { actionType: 'MANUAL_REVIEW' } }
          }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'condition-severity' },
          { id: 'e2', source: 'condition-severity', target: 'output-high', sourceHandle: 'true' },
          { id: 'e3', source: 'condition-severity', target: 'output-normal', sourceHandle: 'false' }
        ]
      }
    });

    // Workflow B (in projectIdB for cross-project test)
    otherProjectWorkflow = await repos.workflows.create({
      id: `wf-other-${Date.now()}`,
      projectId: projectIdB,
      name: 'Other Project Workflow',
      graph: testWorkflow.graph
    });

    // Workflow C (Invalid Graph with disconnected cycle / missing edges)
    invalidGraphWorkflow = await repos.workflows.create({
      id: `wf-invalid-${Date.now()}`,
      projectId: projectIdA,
      name: 'Invalid Topology Workflow',
      graph: {
        nodes: [],
        edges: []
      }
    });

    // Workflow D (Failing node with unsupported operator)
    failingNodeWorkflow = await repos.workflows.create({
      id: `wf-failing-${Date.now()}`,
      projectId: projectIdA,
      name: 'Failing Node Workflow',
      graph: {
        nodes: [
          {
            id: 'trigger-failing',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Trigger', config: {} }
          },
          {
            id: 'condition-failing',
            type: 'condition',
            position: { x: 300, y: 100 },
            data: {
              label: 'Invalid Condition',
              config: {
                fieldPath: 'severity',
                operator: 'non_existent_operator', // will throw in evaluator
                targetValue: 'high'
              }
            }
          }
        ],
        edges: [
          { id: 'e-fail-1', source: 'trigger-failing', target: 'condition-failing' }
        ]
      }
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // 1. Successful execution with valid key and CityPulse payload (severity: high)
  it('1. executes workflow with valid API key and CityPulse payload, taking true branch', async () => {
    const payload = {
      issueId: 'CP-1042',
      category: 'pothole',
      severity: 'high',
      ward: '12'
    };

    const res = await fetch(`${baseUrl}/api/v1/workflows/${testWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${executeToken}`
      },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.executionId).toBeDefined();
    expect(data.workflowId).toBe(testWorkflow.id);
    expect(data.status).toBe('succeeded');
    expect(data.durationMs).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(data.steps)).toBe(true);

    // Verify condition routing:
    // condition-severity -> conditionMet: true
    // output-high -> succeeded
    // output-normal -> skipped
    const conditionStep = data.steps.find((s: any) => s.nodeId === 'condition-severity');
    expect(conditionStep).toBeDefined();
    expect(conditionStep.status).toBe('succeeded');
    expect(conditionStep.output._conditionResult.conditionMet).toBe(true);

    const highOutputStep = data.steps.find((s: any) => s.nodeId === 'output-high');
    expect(highOutputStep).toBeDefined();
    expect(highOutputStep.status).toBe('succeeded');

    const normalOutputStep = data.steps.find((s: any) => s.nodeId === 'output-normal');
    expect(normalOutputStep).toBeDefined();
    expect(normalOutputStep.status).toBe('skipped');
  });

  // 1b. Successful execution taking false branch when severity != high
  it('1b. routes to false branch when severity is low', async () => {
    const payload = {
      issueId: 'CP-1043',
      category: 'street_light',
      severity: 'low',
      ward: '5'
    };

    const res = await fetch(`${baseUrl}/api/v1/workflows/${testWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${executeToken}`
      },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('succeeded');

    const conditionStep = data.steps.find((s: any) => s.nodeId === 'condition-severity');
    expect(conditionStep.output._conditionResult.conditionMet).toBe(false);

    const highOutputStep = data.steps.find((s: any) => s.nodeId === 'output-high');
    expect(highOutputStep.status).toBe('skipped');

    const normalOutputStep = data.steps.find((s: any) => s.nodeId === 'output-normal');
    expect(normalOutputStep.status).toBe('succeeded');
  });

  // 2. Missing API key -> 401
  it('2. rejects request with 401 when Authorization header is missing', async () => {
    const res = await fetch(`${baseUrl}/api/v1/workflows/${testWorkflow.id}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueId: 'CP-1042' })
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  // 3. Invalid API key -> 401
  it('3. rejects request with 401 when API key token is invalid', async () => {
    const res = await fetch(`${baseUrl}/api/v1/workflows/${testWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer rl_live_invalidtoken_1234567890abcdef'
      },
      body: JSON.stringify({ issueId: 'CP-1042' })
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  // 4. Insufficient API-key scope -> 403
  it('4. rejects request with 403 when API key lacks workflows:execute scope', async () => {
    const res = await fetch(`${baseUrl}/api/v1/workflows/${testWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${readOnlyToken}`
      },
      body: JSON.stringify({ issueId: 'CP-1042' })
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  // 5. Workflow not found -> 404
  it('5. returns 404 when workflow does not exist', async () => {
    const nonExistentId = 'wf-non-existent-999999';
    const res = await fetch(`${baseUrl}/api/v1/workflows/${nonExistentId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${executeToken}`
      },
      body: JSON.stringify({ issueId: 'CP-1042' })
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe('NOT_FOUND');
  });

  // 6. Cross-project access rejection -> 403
  it('6. rejects cross-project workflow execution with 403 Forbidden', async () => {
    // Attempting to run otherProjectWorkflow (projectIdB) with executeToken (authorized for projectIdA)
    const res = await fetch(`${baseUrl}/api/v1/workflows/${otherProjectWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${executeToken}`
      },
      body: JSON.stringify({ issueId: 'CP-1042' })
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe('CROSS_PROJECT_FORBIDDEN');
  });

  // 7. Invalid request payload -> 400
  it('7. returns 400 when request body is a string or array instead of JSON object', async () => {
    // Array payload
    const resArray = await fetch(`${baseUrl}/api/v1/workflows/${testWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${executeToken}`
      },
      body: JSON.stringify(['not', 'an', 'object'])
    });

    expect(resArray.status).toBe(400);
    const dataArray = await resArray.json();
    expect(dataArray.error.code).toBe('INVALID_INPUT');

    // Invalid input field type
    const resInput = await fetch(`${baseUrl}/api/v1/workflows/${testWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${executeToken}`
      },
      body: JSON.stringify({ input: 'invalid-string-input' })
    });

    expect(resInput.status).toBe(400);
    const dataInput = await resInput.json();
    expect(dataInput.error.code).toBe('INVALID_INPUT');
  });

  // 8. Invalid workflow graph -> 422
  it('8. returns 422 when workflow graph contains structural errors', async () => {
    const res = await fetch(`${baseUrl}/api/v1/workflows/${invalidGraphWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${executeToken}`
      },
      body: JSON.stringify({ issueId: 'CP-1042' })
    });

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error.code).toBe('INVALID_GRAPH');
    expect(Array.isArray(data.error.details.errors)).toBe(true);
  });

  // 9. Execution failure handled safely -> status: 'failed'
  it('9. handles execution step failure safely and records status as failed', async () => {
    const res = await fetch(`${baseUrl}/api/v1/workflows/${failingNodeWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${executeToken}`
      },
      body: JSON.stringify({ severity: 'high' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('failed');
    expect(data.error).toBeDefined();

    // Verify database record has 'failed' status
    const persisted = await repos.executions.getById(data.executionId);
    expect(persisted).toBeDefined();
    expect(persisted?.status).toBe('failed');
  });

  // 10. Execution history persistence
  it('10. persists execution record and step results in database repository', async () => {
    const payload = { issueId: 'CP-PERSIST-TEST', severity: 'high' };

    const res = await fetch(`${baseUrl}/api/v1/workflows/${testWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${executeToken}`
      },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    const execId = data.executionId;

    // Check execution in repository
    const storedExec = await repos.executions.getById(execId);
    expect(storedExec).toBeDefined();
    expect(storedExec?.status).toBe('succeeded');
    expect(storedExec?.input.issueId).toBe('CP-PERSIST-TEST');

    // Check step records
    const storedSteps = await repos.executions.getSteps(execId);
    expect(storedSteps.length).toBeGreaterThan(0);
    expect(storedSteps.some((s) => s.nodeId === 'output-high')).toBe(true);
  });

  // 11. Idempotency mechanism with Idempotency-Key header
  it('11. prevents duplicate execution when identical Idempotency-Key is provided', async () => {
    const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const payload = { issueId: 'CP-IDEM-01', severity: 'high' };

    // First request
    const res1 = await fetch(`${baseUrl}/api/v1/workflows/${testWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${executeToken}`,
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    expect(res1.status).toBe(200);
    expect(res1.headers.get('Idempotency-Replay')).toBeNull();
    const data1 = await res1.json();

    // Second request with exact same Idempotency-Key
    const res2 = await fetch(`${baseUrl}/api/v1/workflows/${testWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${executeToken}`,
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    expect(res2.status).toBe(200);
    expect(res2.headers.get('Idempotency-Replay')).toBe('true');
    const data2 = await res2.json();

    // Replayed response has identical executionId
    expect(data2.executionId).toBe(data1.executionId);
    expect(data2.status).toBe(data1.status);
  });

  // 12. GET /api/v1/runs/:id retrieves execution telemetry
  it('12. GET /api/v1/runs/:id reads back execution telemetry with executions:read scope', async () => {
    const runRes = await fetch(`${baseUrl}/api/v1/workflows/${testWorkflow.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${executeToken}`
      },
      body: JSON.stringify({ issueId: 'CP-TELEMETRY-TEST' })
    });

    const runData = await runRes.json();
    const execId = runData.executionId;

    const getRes = await fetch(`${baseUrl}/api/v1/runs/${execId}`, {
      headers: {
        Authorization: `Bearer ${executeToken}`
      }
    });

    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.execution.id).toBe(execId);
    expect(Array.isArray(getData.steps)).toBe(true);
  });
});
