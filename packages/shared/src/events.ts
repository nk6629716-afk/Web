import { Collaborator, ExecutionStep, RelayGraph, Workflow } from './types';

export interface RoomJoinPayload {
  workflowId: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface WorkflowUpdatePayload {
  workflowId: string;
  expectedRevision: number;
  graph: RelayGraph;
  updatedBy: string;
}

export interface WorkflowSyncPayload {
  workflow: Workflow;
}

export interface PresenceUpdatePayload {
  collaborators: Collaborator[];
}

export interface ExecutionStartPayload {
  workflowId: string;
  triggerInput?: any;
}

export interface ExecutionEventPayload {
  executionId: string;
  workflowId: string;
  step: ExecutionStep;
  totalSteps?: number;
}

export interface ExecutionCompletePayload {
  executionId: string;
  workflowId: string;
  status: 'succeeded' | 'failed';
  finalOutputs: Record<string, any>;
  durationMs: number;
  error?: string;
}

export interface SocketErrorPayload {
  code: 'STALE_REVISION' | 'INVALID_GRAPH' | 'UNAUTHORIZED' | 'EXECUTION_FAILED' | 'INTERNAL_ERROR';
  message: string;
  canonicalWorkflow?: Workflow;
  details?: any;
}

export interface ClientToServerEvents {
  'room:join': (payload: RoomJoinPayload) => void;
  'workflow:update': (payload: WorkflowUpdatePayload) => void;
  'presence:select': (payload: { workflowId: string; userId: string; nodeId?: string }) => void;
  'execution:start': (payload: ExecutionStartPayload) => void;
}

export interface ServerToClientEvents {
  'workflow:sync': (payload: WorkflowSyncPayload) => void;
  'workflow:updated': (payload: { workflow: Workflow; updatedBy: string }) => void;
  'presence:update': (payload: PresenceUpdatePayload) => void;
  'execution:event': (payload: ExecutionEventPayload) => void;
  'execution:complete': (payload: ExecutionCompletePayload) => void;
  'error': (payload: SocketErrorPayload) => void;
}
