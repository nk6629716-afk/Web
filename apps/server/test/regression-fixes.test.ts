import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createServer } from '../src/server';
import { getRepositories } from '@relay/database';
import { 
  toWorkflowGraphDTO, 
  sanitizeWorkflowGraph, 
  safeJsonStringify,
  NodeType 
} from '@relay/shared';

describe('Regression Tests: Production Bug Fixes (CORS, Cyclic Graph, Integrations)', () => {
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

  describe('Bug 1: CORS & Project/Workflow Creation from Netlify', () => {
    it('allows CORS preflight OPTIONS from https://relayfrontend.netlify.app with credentials', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://relayfrontend.netlify.app',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
      });

      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://relayfrontend.netlify.app');
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    });

    it('allows actual POST /api/projects from https://relayfrontend.netlify.app', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Origin': 'https://relayfrontend.netlify.app',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Netlify Verified Project' })
      });

      expect(res.status).toBe(201);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://relayfrontend.netlify.app');
      const data = await res.json();
      expect(data.project).toBeDefined();
      expect(data.project.name).toBe('Netlify Verified Project');
    });

    it('allows POST /api/workflows to create a workflow', async () => {
      const res = await fetch(`${baseUrl}/api/workflows`, {
        method: 'POST',
        headers: {
          'Origin': 'https://relayfrontend.netlify.app',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Civic Router Flow',
          graph: { nodes: [], edges: [] }
        })
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.workflow).toBeDefined();
      expect(data.workflow.name).toBe('Civic Router Flow');
    });
  });

  describe('Bug 2: Cyclic Object State & Workflow Serialization', () => {
    it('toWorkflowGraphDTO safely sanitizes circular editor references without throwing', () => {
      // Create a node with complex circular references, DOM element mock, and React internal fields
      const circularConfig: any = {
        title: 'Transform Node',
        operation: 'trim',
        nested: { count: 42 }
      };
      circularConfig.self = circularConfig;
      circularConfig.parent = { loop: circularConfig };

      const dirtyNodes = [
        {
          id: 'node-cyclic-1',
          type: 'transform' as NodeType,
          position: { x: 100, y: 150 },
          measured: { width: 250, height: 120 }, // React Flow internal
          selected: true,
          dragging: false,
          data: {
            label: 'Data Sanitizer',
            nodeType: 'transform',
            config: circularConfig,
            lastRun: {
              circularPayload: circularConfig
            },
            onClick: () => console.log('callback'),
            _reactFiber: { tag: 1 }
          }
        }
      ];

      const dirtyEdges = [
        {
          id: 'edge-1',
          source: 'node-cyclic-1',
          target: 'node-cyclic-2',
          sourceHandle: 'out-1',
          targetHandle: 'in-1',
          animated: true,
          data: { circular: circularConfig }
        }
      ];

      // Verifies toWorkflowGraphDTO executes cleanly and produces pure DTO
      const cleanGraph = toWorkflowGraphDTO(dirtyNodes, dirtyEdges);
      expect(cleanGraph.nodes).toHaveLength(1);
      expect(cleanGraph.edges).toHaveLength(1);

      // Verify that plain JSON.stringify does NOT throw "Cyclic object value"
      let jsonOutput = '';
      expect(() => {
        jsonOutput = JSON.stringify(cleanGraph);
      }).not.toThrow();

      const parsed = JSON.parse(jsonOutput);
      expect(parsed.nodes[0].id).toBe('node-cyclic-1');
      expect(parsed.nodes[0].data.config.title).toBe('Transform Node');
      expect(parsed.nodes[0].data.config.self).toBeUndefined(); // Circular ref stripped
      expect(parsed.nodes[0].measured).toBeUndefined(); // Internal field stripped
    });

    it('PUT /api/workflows/:id saves sanitized graph successfully without cyclic error', async () => {
      // First get demo workflow
      const getRes = await fetch(`${baseUrl}/api/workflows/demo-workflow-001`);
      const { workflow } = await getRes.json();

      // Introduce circular reference into graph before sending
      const dirtyGraph = JSON.parse(JSON.stringify(workflow.graph));
      const circularPayload: any = { operation: 'uppercase' };
      circularPayload.loop = circularPayload;

      // Use safeJsonStringify and sanitizeWorkflowGraph
      const cleanGraph = sanitizeWorkflowGraph({
        nodes: [
          ...dirtyGraph.nodes,
          {
            id: 'node-clean-1',
            type: 'transform',
            position: { x: 300, y: 300 },
            data: { label: 'Uppercase', config: circularPayload }
          }
        ],
        edges: dirtyGraph.edges
      });

      const putRes = await fetch(`${baseUrl}/api/workflows/${workflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({
          name: 'Updated Demo Workflow',
          graph: cleanGraph,
          expectedRevision: workflow.revision
        })
      });

      expect(putRes.status).toBe(200);
      const putData = await putRes.json();
      expect(putData.workflow).toBeDefined();
      expect(putData.workflow.revision).toBe(workflow.revision + 1);
    });
  });

  describe('Bug 3: Save and Connect Integration Button & Persistence', () => {
    it('creates and persists integration via POST /api/integrations', async () => {
      const res = await fetch(`${baseUrl}/api/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'CityPulse Emergency Responder',
          appType: 'citypulse',
          baseUrl: 'https://api.citypulse.civic.local',
          httpMethod: 'POST',
          authType: 'bearer',
          secret: 'civic-secret-token-1234',
          timeoutMs: 5000
        })
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.integration).toBeDefined();
      expect(data.integration.name).toBe('CityPulse Emergency Responder');
      expect(data.integration.hasSecret).toBe(true);
      expect(data.integration.maskedSecret).toBe('••••••••');
      expect(data.integration.secret).toBeUndefined(); // Never leaks plaintext secret
    });

    it('rejects invalid integration payloads with clear actionable 400 error', async () => {
      const res = await fetch(`${baseUrl}/api/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '', // Empty name
          baseUrl: 'invalid-url'
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.message).toMatch(/Integration name is required/i);
    });
  });

  describe('Bug 4: Workflow Persistence After Reload & Project Workflows List', () => {
    it('supports GET /api/workflows to list workflows for project', async () => {
      const res = await fetch(`${baseUrl}/api/workflows?projectId=demo-project-001`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.workflows)).toBe(true);
      expect(data.workflows.length).toBeGreaterThan(0);
    });

    it('re-hydrates existing workflow on reload when requested with demo ID', async () => {
      // 1. Create/save workflow
      const createRes = await fetch(`${baseUrl}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Persisted Workflow on Reload',
          graph: {
            nodes: [{ id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } }],
            edges: []
          }
        })
      });
      expect(createRes.status).toBe(201);
      const { workflow: created } = await createRes.json();

      // 2. Update/save revision 1 -> 2
      const saveRes = await fetch(`${baseUrl}/api/workflows/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: 1,
          name: 'Persisted Workflow on Reload (Rev 2)',
          graph: {
            nodes: [{ id: 'n1', type: 'trigger', position: { x: 50, y: 50 }, data: { label: 'Start' } }],
            edges: []
          }
        })
      });
      expect(saveRes.status).toBe(200);
      const { workflow: saved } = await saveRes.json();
      expect(saved.revision).toBe(2);

      // 3. Simulating page reload: GET by saved ID returns updated revision 2
      const reloadRes = await fetch(`${baseUrl}/api/workflows/${saved.id}`);
      expect(reloadRes.status).toBe(200);
      const { workflow: reloaded } = await reloadRes.json();
      expect(reloaded.id).toBe(saved.id);
      expect(reloaded.name).toBe('Persisted Workflow on Reload (Rev 2)');
      expect(reloaded.revision).toBe(2);
    });
  });
});
