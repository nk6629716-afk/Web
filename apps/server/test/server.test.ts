import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createServer } from '../src/server.js';
import { getRepositories } from '@relay/database';
import { SEEDED_SAMPLE_WORKFLOW } from '@relay/shared';

describe('Relay Backend API Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const repos = getRepositories();
    const app = createServer(repos);
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

  it('GET /api/health returns 200 OK and health status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('relay-api');
    expect(typeof data.uptimeSeconds).toBe('number');
  });

  it('GET /api/projects returns projects list', async () => {
    const res = await fetch(`${baseUrl}/api/projects`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.projects)).toBe(true);
    expect(data.projects.length).toBeGreaterThan(0);
  });

  it('POST /api/projects creates a new project', async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Backend Test Suite Project' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.project.name).toBe('Backend Test Suite Project');
    expect(data.project.id).toBeDefined();
  });

  it('GET /api/workflows/:id loads seeded demo workflow', async () => {
    const res = await fetch(`${baseUrl}/api/workflows/${SEEDED_SAMPLE_WORKFLOW.id}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workflow.id).toBe(SEEDED_SAMPLE_WORKFLOW.id);
    expect(data.workflow.graph.nodes.length).toBe(7);
  });

  it('PUT /api/workflows/:id performs optimistic revision-checked save', async () => {
    const getRes = await fetch(`${baseUrl}/api/workflows/${SEEDED_SAMPLE_WORKFLOW.id}`);
    const { workflow } = await getRes.json();

    const putRes = await fetch(`${baseUrl}/api/workflows/${SEEDED_SAMPLE_WORKFLOW.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: workflow.revision,
        graph: workflow.graph,
        name: 'Updated Support Pipeline',
      }),
    });

    expect(putRes.status).toBe(200);
    const putData = await putRes.json();
    expect(putData.workflow.revision).toBe(workflow.revision + 1);
    expect(putData.workflow.name).toBe('Updated Support Pipeline');
  });

  it('PUT /api/workflows/:id rejects stale revision with 409 Conflict', async () => {
    const getRes = await fetch(`${baseUrl}/api/workflows/${SEEDED_SAMPLE_WORKFLOW.id}`);
    const { workflow } = await getRes.json();

    const putRes = await fetch(`${baseUrl}/api/workflows/${SEEDED_SAMPLE_WORKFLOW.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: 0, // Stale revision
        graph: workflow.graph,
      }),
    });

    expect(putRes.status).toBe(409);
    const errData = await putRes.json();
    expect(errData.code).toBe('STALE_REVISION');
    expect(errData.canonicalWorkflow).toBeDefined();
  });

  it('POST /api/workflows/:id/execute runs graph and computes actual outputs', async () => {
    const execRes = await fetch(`${baseUrl}/api/workflows/${SEEDED_SAMPLE_WORKFLOW.id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          customerName: '  Alice Cooper  ',
          priority: 'critical',
          message: 'Server down urgently',
        },
      }),
    });

    expect(execRes.status).toBe(200);
    const data = await execRes.json();
    expect(data.execution.status).toBe('succeeded');
    expect(data.summary.steps.length).toBe(7);
    expect(data.summary.steps.filter((s: any) => s.status === 'succeeded').length).toBeGreaterThanOrEqual(5);
  });

  it('GET /api/workflows/:id/executions lists execution history', async () => {
    const res = await fetch(`${baseUrl}/api/workflows/${SEEDED_SAMPLE_WORKFLOW.id}/executions`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.executions)).toBe(true);
    expect(data.executions.length).toBeGreaterThan(0);
  });
});
