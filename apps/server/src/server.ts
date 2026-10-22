import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getRepositories } from '@relay/database';
import { runWorkflow, validateGraphForExecution } from '@relay/engine';
import { SEEDED_SAMPLE_WORKFLOW } from '@relay/shared';

export function createServer(repos = getRepositories()) {
  const app = express();

  const allowedOrigin = process.env.FRONTEND_URL || '*';
  app.use(cors({
    origin: allowedOrigin,
    credentials: true
  }));
  app.use(express.json());

  // GET /api/health
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'relay-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime())
    });
  });

  // GET /api/projects
  app.get('/api/projects', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await repos.projects.list();
      res.json({ projects });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/projects
  app.post('/api/projects', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, ownerId } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ code: 'INVALID_REQUEST', message: 'Project name is required' });
      }
      const project = await repos.projects.create({ name, ownerId });
      res.status(201).json({ project });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/workflows/:id
  app.get('/api/workflows/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      let workflow = await repos.workflows.getById(id);

      // If demo workflow requested and not in store, supply seeded workflow
      if (!workflow && id === SEEDED_SAMPLE_WORKFLOW.id) {
        workflow = await repos.workflows.create(SEEDED_SAMPLE_WORKFLOW);
      }

      if (!workflow) {
        return res.status(404).json({ code: 'WORKFLOW_NOT_FOUND', message: `Workflow "${id}" not found` });
      }

      res.json({ workflow });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/workflows/:id (revision-checked save)
  app.put('/api/workflows/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { graph, name, expectedRevision } = req.body;

      if (typeof expectedRevision !== 'number') {
        return res.status(400).json({
          code: 'MISSING_REVISION',
          message: 'expectedRevision is required for optimistic locking'
        });
      }

      // Validate graph before saving
      if (graph) {
        const validation = validateGraphForExecution(graph);
        if (!validation.valid) {
          return res.status(422).json({
            code: 'INVALID_GRAPH',
            message: 'Graph contains structural errors',
            errors: validation.errors
          });
        }
      }

      const current = await repos.workflows.getById(id);
      const incoming = {
        id,
        projectId: current?.projectId || 'demo-project-001',
        name: name || current?.name || 'Untitled Workflow',
        graph: graph || current?.graph || { nodes: [], edges: [] },
        revision: expectedRevision,
        updatedAt: new Date().toISOString()
      };

      const result = await repos.workflows.save(incoming, expectedRevision);
      if (result.conflict) {
        return res.status(409).json({
          code: 'STALE_REVISION',
          message: 'Conflict: Workflow has been modified by another collaborator.',
          canonicalWorkflow: result.workflow
        });
      }

      res.json({ workflow: result.workflow });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/workflows/:id/executions
  app.get('/api/workflows/:id/executions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const executions = await repos.executions.listByWorkflow(id);
      res.json({ executions });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/executions/:id
  app.get('/api/executions/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const execution = await repos.executions.getById(id);
      if (!execution) {
        return res.status(404).json({ code: 'EXECUTION_NOT_FOUND', message: `Execution "${id}" not found` });
      }
      const steps = await repos.executions.getSteps(id);
      res.json({ execution, steps });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/workflows/:id/execute
  app.post('/api/workflows/:id/execute', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { input, graphOverride } = req.body;

      let workflow = await repos.workflows.getById(id);
      if (!workflow && id === SEEDED_SAMPLE_WORKFLOW.id) {
        workflow = SEEDED_SAMPLE_WORKFLOW;
      }
      if (!workflow) {
        return res.status(404).json({ code: 'WORKFLOW_NOT_FOUND', message: `Workflow "${id}" not found` });
      }

      const activeGraph = graphOverride || workflow.graph;

      // 1. Create execution record
      const execution = await repos.executions.create({
        workflowId: id,
        input: input || {}
      });

      // 2. Run workflow through execution engine
      const summary = await runWorkflow(activeGraph, {
        executionId: execution.id,
        runtimeInput: input,
        onStepComplete: async (step) => {
          await repos.executions.recordStep(step);
        },
        onStepFailed: async (step) => {
          await repos.executions.recordStep(step);
        },
        onStepSkipped: async (step) => {
          await repos.executions.recordStep(step);
        }
      });

      // 3. Update execution status in database
      const updatedExec = await repos.executions.update(execution.id, {
        status: summary.status,
        finishedAt: new Date().toISOString()
      });

      res.json({
        execution: updatedExec,
        summary
      });
    } catch (err: any) {
      res.status(500).json({
        code: 'EXECUTION_ERROR',
        message: err.message || 'Execution failed'
      });
    }
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    });
  });

  return app;
}
