import { Server as SocketIOServer, Socket } from 'socket.io';
import { 
  Collaborator, 
  ExecutionStep, 
  RoomJoinPayload, 
  WorkflowUpdatePayload,
  SEEDED_SAMPLE_WORKFLOW
} from '@relay/shared';
import { IRepositories } from '@relay/database';
import { runWorkflow, validateGraphForExecution } from '@relay/engine';

interface UserSession {
  socketId: string;
  workflowId: string;
  collaborator: Collaborator;
}

export function setupSocketIO(io: SocketIOServer, repos: IRepositories) {
  const sessions = new Map<string, UserSession>(); // socketId -> session

  const getCollaboratorsInRoom = (workflowId: string): Collaborator[] => {
    return Array.from(sessions.values())
      .filter(s => s.workflowId === workflowId)
      .map(s => s.collaborator);
  };

  io.on('connection', (socket: Socket) => {
    // 1. Join room
    socket.on('room:join', async (payload: RoomJoinPayload) => {
      const { workflowId, user } = payload;
      socket.join(workflowId);

      const colors = ['#38bdf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c'];
      const userColor = colors[Math.floor(Math.random() * colors.length)];

      const collaborator: Collaborator = {
        id: user.id || socket.id,
        name: user.name || 'Anonymous Peer',
        color: userColor,
        avatarUrl: user.avatarUrl,
        lastActiveAt: Date.now()
      };

      sessions.set(socket.id, {
        socketId: socket.id,
        workflowId,
        collaborator
      });

      // Send canonical workflow snapshot to joining client
      let workflow = await repos.workflows.getById(workflowId);
      if (!workflow && workflowId === SEEDED_SAMPLE_WORKFLOW.id) {
        workflow = await repos.workflows.create(SEEDED_SAMPLE_WORKFLOW);
      }

      if (workflow) {
        socket.emit('workflow:sync', { workflow });
      }

      // Broadcast presence
      io.to(workflowId).emit('presence:update', {
        collaborators: getCollaboratorsInRoom(workflowId)
      });
    });

    // 2. Workflow updates with optimistic revision check
    socket.on('workflow:update', async (payload: WorkflowUpdatePayload) => {
      const { workflowId, expectedRevision, graph, updatedBy } = payload;

      // Validate graph
      const validation = validateGraphForExecution(graph);
      if (!validation.valid) {
        socket.emit('error', {
          code: 'INVALID_GRAPH',
          message: 'Graph validation failed',
          details: validation.errors
        });
        return;
      }

      const current = await repos.workflows.getById(workflowId);
      if (!current) {
        socket.emit('error', {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found'
        });
        return;
      }

      const result = await repos.workflows.save({
        ...current,
        graph
      }, expectedRevision);

      if (result.conflict) {
        // Send conflict response back to the sender with latest canonical state
        socket.emit('error', {
          code: 'STALE_REVISION',
          message: 'Stale update rejected: another user updated the workflow.',
          canonicalWorkflow: result.workflow
        });
        return;
      }

      // Broadcast accepted change to all other peers in the room
      socket.to(workflowId).emit('workflow:updated', {
        workflow: result.workflow,
        updatedBy
      });

      // Confirm back to sender
      socket.emit('workflow:sync', {
        workflow: result.workflow
      });
    });

    // 3. Selection presence
    socket.on('presence:select', (payload: { workflowId: string; userId: string; nodeId?: string }) => {
      const session = sessions.get(socket.id);
      if (session) {
        session.collaborator.selectedNodeId = payload.nodeId;
        session.collaborator.lastActiveAt = Date.now();
        io.to(payload.workflowId).emit('presence:update', {
          collaborators: getCollaboratorsInRoom(payload.workflowId)
        });
      }
    });

    // 4. Execution start with real streaming events
    socket.on('execution:start', async (payload: { workflowId: string; triggerInput?: any }) => {
      const { workflowId, triggerInput } = payload;

      let workflow = await repos.workflows.getById(workflowId);
      if (!workflow && workflowId === SEEDED_SAMPLE_WORKFLOW.id) {
        workflow = SEEDED_SAMPLE_WORKFLOW;
      }

      if (!workflow) {
        socket.emit('error', {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found for execution'
        });
        return;
      }

      // Create execution record in DB
      const execution = await repos.executions.create({
        workflowId,
        input: triggerInput || {}
      });

      try {
        const summary = await runWorkflow(workflow.graph, {
          executionId: execution.id,
          runtimeInput: triggerInput,
          stepDelayMs: 450, // Paced for real-time visualization across both browser sessions
          onStepStart: (step) => {
            io.to(workflowId).emit('execution:event', {
              executionId: execution.id,
              workflowId,
              step: step as ExecutionStep
            });
          },
          onStepComplete: async (step) => {
            await repos.executions.recordStep(step);
            io.to(workflowId).emit('execution:event', {
              executionId: execution.id,
              workflowId,
              step
            });
          },
          onStepFailed: async (step) => {
            await repos.executions.recordStep(step);
            io.to(workflowId).emit('execution:event', {
              executionId: execution.id,
              workflowId,
              step
            });
          },
          onStepSkipped: async (step) => {
            await repos.executions.recordStep(step);
            io.to(workflowId).emit('execution:event', {
              executionId: execution.id,
              workflowId,
              step
            });
          }
        });

        await repos.executions.update(execution.id, {
          status: summary.status,
          finishedAt: new Date().toISOString()
        });

        io.to(workflowId).emit('execution:complete', {
          executionId: execution.id,
          workflowId,
          status: summary.status,
          finalOutputs: summary.finalOutputs,
          durationMs: summary.durationMs,
          error: summary.error
        });
      } catch (err: any) {
        await repos.executions.update(execution.id, {
          status: 'failed',
          finishedAt: new Date().toISOString()
        });

        io.to(workflowId).emit('execution:complete', {
          executionId: execution.id,
          workflowId,
          status: 'failed',
          finalOutputs: {},
          durationMs: 0,
          error: err.message
        });
      }
    });

    // 5. Disconnect
    socket.on('disconnect', () => {
      const session = sessions.get(socket.id);
      if (session) {
        const { workflowId } = session;
        sessions.delete(socket.id);
        io.to(workflowId).emit('presence:update', {
          collaborators: getCollaboratorsInRoom(workflowId)
        });
      }
    });
  });
}
