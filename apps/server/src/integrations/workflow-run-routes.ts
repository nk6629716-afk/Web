import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { IRepositories } from '@relay/database';
import { runWorkflow, validateGraphForExecution } from '@relay/engine';
import { requireApiKeyAuth } from './api-key-auth';
import { ApiError, NotFoundError, ForbiddenError, ValidationError } from './errors';
import { createIntegrationInvoker } from './integration-routes';

// Sliding in-memory idempotency cache (TTL: 5 minutes)
interface IdempotencyRecord {
  statusCode: number;
  responseBody: any;
  cachedAt: number;
}
const idempotencyStore = new Map<string, IdempotencyRecord>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

export function createWorkflowRunRouter(repos: IRepositories): Router {
  const router = Router();

  /**
   * POST /api/v1/workflows/:id/runs
   * Public execution endpoint for external services (CityPulse, CivicConnect, etc.)
   * Requires Bearer API key authentication with 'workflows:execute' scope.
   */
  router.post(
    '/:id/runs',
    requireApiKeyAuth(repos, ['workflows:execute']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;

        // 1. Validate payload format (must be a valid JSON object, not array or primitive)
        if (
          !req.body ||
          typeof req.body !== 'object' ||
          Array.isArray(req.body)
        ) {
          throw new ApiError('INVALID_INPUT', 'Request body must be a valid JSON object', 400);
        }

        // Support direct payload { issueId: "CP-1042", ... } or nested { input: { issueId: ... } }
        let runtimeInput: Record<string, any>;
        if (req.body.input !== undefined) {
          if (
            typeof req.body.input !== 'object' ||
            req.body.input === null ||
            Array.isArray(req.body.input)
          ) {
            throw new ApiError('INVALID_INPUT', 'Field "input" must be a valid JSON object', 400);
          }
          runtimeInput = req.body.input;
        } else {
          runtimeInput = req.body;
        }

        // 2. Verify workflow existence
        const workflow = await repos.workflows.getById(id);
        if (!workflow) {
          throw new NotFoundError(`Workflow "${id}"`);
        }

        // 3. Project isolation & access control check (prevent cross-project execution)
        if (req.projectId && workflow.projectId !== req.projectId) {
          throw new ForbiddenError(
            `Access denied: Workflow "${id}" does not belong to authorized project "${req.projectId}"`,
            'CROSS_PROJECT_FORBIDDEN',
            {
              workflowProjectId: workflow.projectId,
              authorizedProjectId: req.projectId
            }
          );
        }

        // 4. Validate workflow graph topology before running
        const graphValidation = validateGraphForExecution(workflow.graph);
        if (!graphValidation.valid) {
          throw new ApiError(
            'INVALID_GRAPH',
            'Workflow graph contains structural errors and cannot be executed',
            422,
            { errors: graphValidation.errors }
          );
        }

        // 5. Check Idempotency-Key header to prevent duplicate execution
        const incomingIdempotencyKey = req.headers['idempotency-key'] as string | undefined;
        let idempotencyKey: string | undefined;
        if (incomingIdempotencyKey && typeof incomingIdempotencyKey === 'string' && incomingIdempotencyKey.trim()) {
          idempotencyKey = incomingIdempotencyKey.trim();
          const cacheKey = `${req.projectId || 'any'}:${id}:${idempotencyKey}`;
          const cached = idempotencyStore.get(cacheKey);

          if (cached && Date.now() - cached.cachedAt < IDEMPOTENCY_TTL_MS) {
            res.setHeader('Idempotency-Replay', 'true');
            return res.status(cached.statusCode).json(cached.responseBody);
          }
        }

        // 6. Create execution record with persistent repository (with resilient fallback)
        let execution: any = null;
        let dbPersistenceAvailable = true;

        try {
          execution = await repos.executions.create({
            workflowId: workflow.id,
            input: runtimeInput
          });
        } catch (execErr: any) {
          console.warn('Could not record execution in persistent store, running in memory-trace mode:', execErr?.message);
          dbPersistenceAvailable = false;
          execution = {
            id: `exec-transient-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            workflowId: workflow.id,
            status: 'running',
            input: runtimeInput,
            startedAt: new Date().toISOString()
          };
        }

        // 7. Run workflow engine with topological execution and step callbacks
        const summary = await runWorkflow(workflow.graph, {
          executionId: execution.id,
          runtimeInput,
          integrationInvoker: createIntegrationInvoker(repos),
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

        // 8. Update execution status in database
        let updatedExecution = execution;
        const finishedAt = new Date().toISOString();

        if (dbPersistenceAvailable) {
          try {
            updatedExecution = await repos.executions.update(execution.id, {
              status: summary.status,
              finishedAt
            });
          } catch {
            updatedExecution = {
              ...execution,
              status: summary.status,
              finishedAt
            };
          }
        } else {
          updatedExecution = {
            ...execution,
            status: summary.status,
            finishedAt
          };
        }

        // 9. Format response payload
        const responsePayload = {
          executionId: updatedExecution.id,
          workflowId: workflow.id,
          projectId: workflow.projectId,
          status: summary.status,
          startedAt: updatedExecution.startedAt,
          finishedAt: updatedExecution.finishedAt || finishedAt,
          durationMs: summary.durationMs,
          steps: summary.steps,
          outputs: summary.finalOutputs,
          ...(summary.error ? { error: summary.error } : {})
        };

        // Cache for idempotency if key was provided
        if (idempotencyKey) {
          const cacheKey = `${req.projectId || 'any'}:${id}:${idempotencyKey}`;
          idempotencyStore.set(cacheKey, {
            statusCode: 200,
            responseBody: responsePayload,
            cachedAt: Date.now()
          });
        }

        res.status(200).json(responsePayload);
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * GET /api/v1/workflows/:id
   * Read-only public inspection of a workflow graph with 'workflows:read' scope.
   */
  router.get(
    '/:id',
    requireApiKeyAuth(repos, ['workflows:read']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const workflow = await repos.workflows.getById(id);
        if (!workflow) {
          throw new NotFoundError(`Workflow "${id}"`);
        }

        if (req.projectId && workflow.projectId !== req.projectId) {
          throw new ForbiddenError(`Access denied: Workflow "${id}" does not belong to authorized project`);
        }

        res.json({ workflow });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}

/**
 * Public Runs Router
 * GET /api/v1/runs/:id to inspect execution telemetry with 'executions:read' scope.
 */
export function createRunsRouter(repos: IRepositories): Router {
  const router = Router();

  router.get(
    '/:id',
    requireApiKeyAuth(repos, ['executions:read']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const execution = await repos.executions.getById(id);
        if (!execution) {
          throw new NotFoundError(`Execution "${id}"`);
        }

        // Project isolation check via associated workflow
        const workflow = await repos.workflows.getById(execution.workflowId);
        if (workflow && req.projectId && workflow.projectId !== req.projectId) {
          throw new ForbiddenError(`Access denied: Execution "${id}" belongs to an unauthorized project`);
        }

        const steps = await repos.executions.getSteps(id);
        res.json({ execution, steps });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
