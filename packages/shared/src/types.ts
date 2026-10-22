export type NodeType = 'trigger' | 'transform' | 'condition' | 'output';

export type TransformOperation =
  | 'trim'
  | 'lowercase'
  | 'uppercase'
  | 'extract_field'
  | 'json_parse'
  | 'template';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

export type NodeStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped';

export type ExecutionStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface TriggerConfig {
  payload?: Record<string, unknown> | string;
}

export interface TransformConfig {
  operation: TransformOperation;
  field?: string;
  outputField?: string;
  template?: string;
}

export interface ConditionConfig {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

export interface OutputConfig {
  title?: string;
  messageTemplate?: string;
  fieldsToInclude?: string[];
}

export type NodeConfig =
  | TriggerConfig
  | TransformConfig
  | ConditionConfig
  | OutputConfig
  | Record<string, unknown>;

export interface WorkflowNodeData {
  [key: string]: any;
  label: string;
  nodeType: NodeType;
  config: Record<string, any>;
  status?: NodeStatus;
  lastRun?: {
    output?: unknown;
    error?: string;
    durationMs?: number;
    executedAt?: string;
  };
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  projectId: string;
  name: string;
  graph: WorkflowGraph;
  revision: number;
  updatedAt: string;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  revision: number;
  graph: WorkflowGraph;
  createdBy?: string;
  createdAt: string;
}

export interface ExecutionStepResult {
  id: string;
  executionId: string;
  nodeId: string;
  status: NodeStatus;
  input?: unknown;
  output?: unknown;
  errorMessage?: string;
  durationMs: number;
}

export interface Execution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  triggeredBy?: string;
  input?: Record<string, unknown>;
  steps: ExecutionStepResult[];
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Collaborator {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  color: string;
  activeNodeId?: string | null;
  lastActive: string;
}
