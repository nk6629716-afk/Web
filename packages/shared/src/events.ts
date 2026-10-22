import { Collaborator, ExecutionStepResult, Workflow, WorkflowGraph } from './types.js';

export interface RoomJoinPayload {
  workflowId: string;
  user: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface RoomJoinedPayload {
  workflowId: string;
  workflow: Workflow;
  collaborators: Collaborator[];
}

export interface WorkflowUpdatePayload {
  workflowId: string;
  expectedRevision: number;
  graph: WorkflowGraph;
  name?: string;
}

export interface WorkflowSyncPayload {
  workflowId: string;
  workflow: Workflow;
  reason?: 'conflict_rejected' | 'initial_sync' | 'peer_update';
}

export interface PresenceUpdatePayload {
  workflowId: string;
  collaborators: Collaborator[];
}

export interface PresenceHeartbeatPayload {
  workflowId: string;
  activeNodeId?: string | null;
}

export interface ExecutionStartPayload {
  workflowId: string;
  input?: Record<string, unknown>;
}

export interface ExecutionEventPayload {
  executionId: string;
  workflowId: string;
  step: ExecutionStepResult;
}

export interface ExecutionCompletePayload {
  executionId: string;
  workflowId: string;
  status: 'succeeded' | 'failed';
  totalDurationMs: number;
  steps: ExecutionStepResult[];
  error?: string;
}

export interface SocketErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ClientToServerEvents {
  'room:join': (payload: RoomJoinPayload) => void;
  'room:leave': (payload: { workflowId: string }) => void;
  'workflow:update': (payload: WorkflowUpdatePayload) => void;
  'presence:heartbeat': (payload: PresenceHeartbeatPayload) => void;
  'execution:start': (payload: ExecutionStartPayload) => void;
}

export interface ServerToClientEvents {
  'room:joined': (payload: RoomJoinedPayload) => void;
  'workflow:sync': (payload: WorkflowSyncPayload) => void;
  'presence:update': (payload: PresenceUpdatePayload) => void;
  'execution:event': (payload: ExecutionEventPayload) => void;
  'execution:complete': (payload: ExecutionCompletePayload) => void;
  'error': (payload: SocketErrorPayload) => void;
}
