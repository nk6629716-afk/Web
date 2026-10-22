import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from '../src/server.js';
import { setupSocketIO } from '../src/sockets.js';
import { getRepositories } from '@relay/database';
import { SEEDED_SAMPLE_WORKFLOW } from '@relay/shared';

describe('Relay Backend Realtime Socket.IO Integration Tests', () => {
  let server: http.Server;
  let serverPort: number;
  let client1: ClientSocket;
  let client2: ClientSocket;

  beforeAll(async () => {
    const repos = getRepositories();
    const app = createServer(repos);
    server = http.createServer(app);
    const ioServer = new SocketIOServer(server, { cors: { origin: '*' } });
    setupSocketIO(ioServer, repos);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('allows clients to connect and receive initial canonical workflow:sync and presence', async () => {
    const socketUrl = `http://127.0.0.1:${serverPort}`;

    client1 = ioc(socketUrl, { reconnection: false, transports: ['websocket'] });
    client2 = ioc(socketUrl, { reconnection: false, transports: ['websocket'] });

    await Promise.all([
      new Promise<void>((resolve) => client1.on('connect', resolve)),
      new Promise<void>((resolve) => client2.on('connect', resolve)),
    ]);

    const syncPromise = new Promise<any>((resolve) => {
      client1.on('workflow:sync', resolve);
    });

    const presencePromise = new Promise<any>((resolve) => {
      client2.on('presence:update', resolve);
    });

    client1.emit('room:join', {
      workflowId: SEEDED_SAMPLE_WORKFLOW.id,
      user: { id: 'peer-1', name: 'Developer One' },
    });

    client2.emit('room:join', {
      workflowId: SEEDED_SAMPLE_WORKFLOW.id,
      user: { id: 'peer-2', name: 'Developer Two' },
    });

    const [syncPayload, presencePayload] = await Promise.all([syncPromise, presencePromise]);

    expect(syncPayload.workflow.id).toBe(SEEDED_SAMPLE_WORKFLOW.id);
    expect(syncPayload.workflow.graph.nodes.length).toBe(5); // Refund Router: 5 nodes
    expect(Array.isArray(presencePayload.collaborators)).toBe(true);
  });

  it('broadcasts workflow:updated to other clients when graph changes are accepted', async () => {
    const repos = getRepositories();
    const currentWf = (await repos.workflows.getById(SEEDED_SAMPLE_WORKFLOW.id))!;

    const updateReceived = new Promise<any>((resolve) => {
      client2.on('workflow:updated', resolve);
    });

    client1.emit('workflow:update', {
      workflowId: SEEDED_SAMPLE_WORKFLOW.id,
      expectedRevision: currentWf.revision,
      graph: currentWf.graph,
      updatedBy: 'Developer One',
    });

    const updatePayload = await updateReceived;
    expect(updatePayload.workflow.revision).toBe(currentWf.revision + 1);
    expect(updatePayload.updatedBy).toBe('Developer One');
  });

  it('rejects stale workflow updates with error STALE_REVISION', async () => {
    const errorReceived = new Promise<any>((resolve) => {
      client1.once('error', resolve);
    });

    client1.emit('workflow:update', {
      workflowId: SEEDED_SAMPLE_WORKFLOW.id,
      expectedRevision: 0, // Stale
      graph: SEEDED_SAMPLE_WORKFLOW.graph,
      updatedBy: 'Developer One',
    });

    const errorPayload = await errorReceived;
    expect(errorPayload.code).toBe('STALE_REVISION');
    expect(errorPayload.canonicalWorkflow).toBeDefined();
  });

  it('streams execution:event and emits execution:complete when execution:start is triggered', async () => {
    const events: any[] = [];

    const completionPromise = new Promise<any>((resolve) => {
      client2.on('execution:complete', resolve);
    });

    client2.on('execution:event', (evt) => {
      events.push(evt);
    });

    client1.emit('execution:start', {
      workflowId: SEEDED_SAMPLE_WORKFLOW.id,
      triggerInput: {
        customerName: 'Realtime Test User',
        priority: 'critical',
      },
    });

    const completion = await completionPromise;
    expect(completion.status).toBe('succeeded');
    expect(completion.executionId).toBeDefined();
    expect(events.length).toBeGreaterThan(0);
  });
});
