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

  // GET /api/database/status
  app.get('/api/database/status', async (req: Request, res: Response) => {
    try {
      let projectsOk = false;
      let workflowsOk = false;
      let errorDetails: string | null = null;

      try {
        await repos.projects.list();
        projectsOk = true;
      } catch (err: any) {
        errorDetails = err.message;
      }

      try {
        await repos.workflows.getById('00000000-0000-0000-0000-000000000000');
        workflowsOk = true;
      } catch (err: any) {
        if (!errorDetails) errorDetails = err.message;
      }

      const isReady = projectsOk && workflowsOk;

      res.json({
        status: isReady ? 'ready' : 'migration_required',
        databaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        supabaseUrl: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/:\/\/.*@/, '://') : null,
        checks: {
          projectsTable: projectsOk,
          workflowsTable: workflowsOk
        },
        migrationFile: 'database/migrations/001_initial_schema.sql',
        reloadCommand: "NOTIFY pgrst, 'reload schema';",
        message: isReady 
          ? 'Database tables verified and schema cache active.' 
          : 'Database tables not found in schema cache. Run database/migrations/001_initial_schema.sql in Supabase SQL editor and reload cache.'
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        message: err.message
      });
    }
  });

  // GET /api/workflows/:id
  app.get('/api/workflows/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      let workflow: any = null;

      try {
        workflow = await repos.workflows.getById(id);
      } catch (err: any) {
        if (id === SEEDED_SAMPLE_WORKFLOW.id) {
          console.warn('Database unavailable when reading demo workflow; serving in-memory seeded workflow:', err.message);
          res.setHeader('x-relay-db-status', 'migration-required');
          return res.json({ 
            workflow: SEEDED_SAMPLE_WORKFLOW,
            _databaseNotice: 'Database schema migration required. Run database/migrations/001_initial_schema.sql in Supabase SQL editor.'
          });
        }
        throw err;
      }

      // If demo workflow requested and not in store, attempt to seed, but fall back to memory
      if (!workflow && id === SEEDED_SAMPLE_WORKFLOW.id) {
        try {
          workflow = await repos.workflows.create(SEEDED_SAMPLE_WORKFLOW);
        } catch (seedErr) {
          console.warn('Could not persist seeded workflow into database:', seedErr);
          workflow = SEEDED_SAMPLE_WORKFLOW;
        }
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

      // 1. Create execution record (with resilient fallback if DB tables not yet migrated)
      let execution: any = null;
      let dbPersistenceAvailable = true;
      try {
        execution = await repos.executions.create({
          workflowId: id,
          input: input || {}
        });
      } catch (execErr: any) {
        console.warn('Could not record execution in database, running in memory-trace mode:', execErr.message);
        dbPersistenceAvailable = false;
        execution = {
          id: `exec-transient-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          workflowId: id,
          status: 'running',
          input: input || {},
          startedAt: new Date().toISOString()
        };
      }

      // 2. Run workflow through execution engine
      const summary = await runWorkflow(activeGraph, {
        executionId: execution.id,
        runtimeInput: input,
        onStepComplete: async (step) => {
          if (dbPersistenceAvailable) {
            try { await repos.executions.recordStep(step); } catch {}
          }
        },
        onStepFailed: async (step) => {
          if (dbPersistenceAvailable) {
            try { await repos.executions.recordStep(step); } catch {}
          }
        },
        onStepSkipped: async (step) => {
          if (dbPersistenceAvailable) {
            try { await repos.executions.recordStep(step); } catch {}
          }
        }
      });

      // 3. Update execution status in database
      let updatedExec = execution;
      if (dbPersistenceAvailable) {
        try {
          updatedExec = await repos.executions.update(execution.id, {
            status: summary.status,
            finishedAt: new Date().toISOString()
          });
        } catch {
          updatedExec = {
            ...execution,
            status: summary.status,
            finishedAt: new Date().toISOString()
          };
        }
      } else {
        updatedExec = {
          ...execution,
          status: summary.status,
          finishedAt: new Date().toISOString()
        };
      }

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
    const msg = err.message || '';
    if (msg.includes('schema cache') || msg.includes('Database schema not initialized') || msg.includes('does not exist')) {
      return res.status(503).json({
        code: 'DATABASE_MIGRATION_REQUIRED',
        message: msg,
        action: "Please execute database/migrations/001_initial_schema.sql in your Supabase SQL Editor and reload schema cache (NOTIFY pgrst, 'reload schema';)."
      });
    }

    res.status(err.status || 500).json({
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    });
  });

  return app;
}
