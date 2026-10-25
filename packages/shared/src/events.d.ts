import { Collaborator, ExecutionStep, RelayGraph, Workflow } from './types';
export interface RoomJoinPayload {
    workflowId: string;
    user: {
        id?: string;
        userId?: string;
        name?: string;
        displayName?: string;
        email?: string;
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
    graph: RelayGraph;
    name?: string;
    updatedBy?: string;
}
export interface WorkflowSyncPayload {
    workflow: Workflow;
    workflowId?: string;
    reason?: 'conflict_rejected' | 'initial_sync' | 'peer_update';
}
export interface PresenceUpdatePayload {
    workflowId?: string;
    collaborators: Collaborator[];
}
export interface PresenceHeartbeatPayload {
    workflowId: string;
    activeNodeId?: string | null;
}
export interface ExecutionStartPayload {
    workflowId: string;
    triggerInput?: any;
    input?: Record<string, unknown>;
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
    finalOutputs?: Record<string, any>;
    durationMs?: number;
    totalDurationMs?: number;
    steps?: ExecutionStep[];
    error?: string;
}
export interface SocketErrorPayload {
    code: string;
    message: string;
    canonicalWorkflow?: Workflow;
    details?: any;
}
export interface ClientToServerEvents {
    'room:join': (payload: RoomJoinPayload) => void;
    'room:leave'?: (payload: {
        workflowId: string;
    }) => void;
    'workflow:update': (payload: WorkflowUpdatePayload) => void;
    'presence:select'?: (payload: {
        workflowId: string;
        userId: string;
        nodeId?: string;
    }) => void;
    'presence:heartbeat'?: (payload: PresenceHeartbeatPayload) => void;
    'execution:start': (payload: ExecutionStartPayload) => void;
}
export interface ServerToClientEvents {
    'room:joined'?: (payload: RoomJoinedPayload) => void;
    'workflow:sync': (payload: WorkflowSyncPayload) => void;
    'workflow:updated'?: (payload: {
        workflow: Workflow;
        updatedBy: string;
    }) => void;
    'presence:update': (payload: PresenceUpdatePayload) => void;
    'execution:event': (payload: ExecutionEventPayload) => void;
    'execution:complete': (payload: ExecutionCompletePayload) => void;
    'error': (payload: SocketErrorPayload) => void;
}
//# sourceMappingURL=events.d.ts.map