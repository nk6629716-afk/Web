export type NodeType = 'trigger' | 'transform' | 'condition' | 'output';

export type NodeStatus = 'idle' | 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

export type ExecutionStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface TriggerConfig {
  payload?: Record<string, unknown> | string;
  initialPayload?: Record<string, any>;
  triggerType?: 'manual' | 'webhook' | 'schedule';
}

export type TransformOp = 
  | 'trim' 
  | 'lowercase' 
  | 'uppercase' 
  | 'trim_and_lowercase'   // E-Commerce Refund Router: trim whitespace then lowercase
  | 'json_parse' 
  | 'json_stringify'
  | 'extract_field' 
  | 'template'
  | 'math_add'
  | 'default_value';

export type TransformOperation = TransformOp;

export interface TransformConfig {
  operation: TransformOp;
  field?: string;
  fieldPath?: string;
  outputField?: string;
  targetField?: string;
  template?: string;
  operand?: number;
  defaultValue?: any;
}

export type ConditionOp = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains'
  | 'greater_than' 
  | 'less_than' 
  | 'is_empty' 
  | 'is_not_empty';

export type ConditionOperator = ConditionOp;

export interface ConditionConfig {
  field?: string;
  fieldPath?: string;
  operator: ConditionOp;
  value?: any;
  targetValue?: any;
}

export interface OutputConfig {
  destination?: 'response' | 'log' | 'webhook' | 'integration';
  integrationId?: string;
  endpointPath?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  title?: string;
  label?: string;
  messageTemplate?: string;
  fieldsToInclude?: string[];
  includeMetadata?: boolean;
}

export type NodeConfig =
  | TriggerConfig
  | TransformConfig
  | ConditionConfig
  | OutputConfig
  | Record<string, unknown>;

export interface RelayNodeData {
  [key: string]: any;
  label: string;
  type?: NodeType;
  nodeType?: NodeType;
  config: Record<string, any>;
  status?: NodeStatus;
  lastRun?: {
    input?: any;
    output?: any;
    durationMs?: number;
    error?: string;
    executedAt?: string;
  };
}

export type WorkflowNodeData = RelayNodeData;

export interface RelayNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: RelayNodeData;
}

export type WorkflowNode = RelayNode;

export interface RelayEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  animated?: boolean;
}

export type WorkflowEdge = RelayEdge;

export interface RelayGraph {
  nodes: RelayNode[];
  edges: RelayEdge[];
}

export type WorkflowGraph = RelayGraph;

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

export type ExecutionStepResult = ExecutionStep;

export interface Execution {
  id: string;
  workflowId: string;
  status: 'running' | 'succeeded' | 'failed' | 'pending';
  triggeredBy?: string;
  input?: any;
  steps?: ExecutionStep[];
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

export interface Collaborator {
  id?: string;
  userId?: string;
  name?: string;
  displayName?: string;
  email?: string;
  color: string;
  avatarUrl?: string;
  lastActiveAt?: number;
  lastActive?: string;
  activeNodeId?: string | null;
  selectedNodeId?: string;
  status?: 'viewing' | 'editing' | 'saving';
}

export type ApiKeyScope = 
  | 'workflows:read'
  | 'workflows:execute'
  | 'executions:read'
  | 'webhooks:manage';

export interface ApiKey {
  id: string;
  projectId: string;
  name: string;
  keyPrefix: string;
  secretHash: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
}

export interface ApiKeyCreatedResponse {
  apiKey: Omit<ApiKey, 'secretHash'>;
  plaintextToken: string;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: any;
  };
}

export type AuthType = 'none' | 'bearer' | 'api_key' | 'basic' | 'custom_header';

export interface AppIntegration {
  id: string;
  projectId: string;
  name: string;
  appType?: 'citypulse' | 'generic_http' | 'slack' | 'webhook';
  baseUrl: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  authType: AuthType;
  encryptedAuth?: string;
  authHeaderName?: string;
  headers?: Record<string, string>;
  timeoutMs: number;
  testEndpoint?: string;
  testMethod?: 'GET' | 'POST';
  status: 'active' | 'inactive' | 'error';
  lastTestedAt?: string;
  lastTestStatus?: 'succeeded' | 'failed';
  lastTestMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppIntegrationSafeResponse extends Omit<AppIntegration, 'encryptedAuth'> {
  hasSecret?: boolean;
  maskedSecret?: string;
}

export interface TestConnectionResult {
  success: boolean;
  statusCode?: number;
  durationMs: number;
  message: string;
  responseSnippet?: string;
  responseData?: any;
}

