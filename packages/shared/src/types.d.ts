export type NodeType = 'trigger' | 'transform' | 'condition' | 'output';
export type NodeStatus = 'idle' | 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
export interface TriggerConfig {
    initialPayload: Record<string, any>;
    triggerType?: 'manual' | 'webhook' | 'schedule';
}
export type TransformOp = 'trim' | 'lowercase' | 'uppercase' | 'json_parse' | 'json_stringify' | 'extract_field' | 'template' | 'math_add' | 'default_value';
export interface TransformConfig {
    operation: TransformOp;
    fieldPath?: string;
    targetField?: string;
    template?: string;
    operand?: number;
    defaultValue?: any;
}
export type ConditionOp = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
export interface ConditionConfig {
    fieldPath: string;
    operator: ConditionOp;
    targetValue: any;
}
export interface OutputConfig {
    destination: 'response' | 'log' | 'webhook';
    includeMetadata?: boolean;
    label?: string;
}
export interface RelayNodeData {
    [key: string]: any;
    label: string;
    type: NodeType;
    config: Record<string, any>;
    status?: NodeStatus;
    lastRun?: {
        input?: any;
        output?: any;
        durationMs?: number;
        error?: string;
    };
}
export interface RelayNode {
    id: string;
    type: NodeType;
    position: {
        x: number;
        y: number;
    };
    data: RelayNodeData;
}
export interface RelayEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    label?: string;
    animated?: boolean;
}
export interface RelayGraph {
    nodes: RelayNode[];
    edges: RelayEdge[];
}
export interface Workflow {
    id: string;
    projectId: string;
    name: string;
    graph: RelayGraph;
    revision: number;
    updatedAt: string;
}
export interface WorkflowVersion {
    id: string;
    workflowId: string;
    revision: number;
    graph: RelayGraph;
    createdBy?: string;
    createdAt: string;
}
export interface Project {
    id: string;
    name: string;
    ownerId?: string;
    createdAt: string;
}
export interface Execution {
    id: string;
    workflowId: string;
    status: 'running' | 'succeeded' | 'failed';
    triggeredBy?: string;
    input: any;
    startedAt: string;
    finishedAt?: string;
}
export interface ExecutionStep {
    id: string;
    executionId: string;
    nodeId: string;
    status: NodeStatus;
    input?: any;
    output?: any;
    errorMessage?: string;
    durationMs?: number;
    startedAt?: string;
    finishedAt?: string;
}
export interface Collaborator {
    id: string;
    name: string;
    color: string;
    avatarUrl?: string;
    lastActiveAt: number;
    selectedNodeId?: string;
}
//# sourceMappingURL=types.d.ts.map