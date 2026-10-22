import { z } from 'zod';

export const NodeTypeSchema = z.enum(['trigger', 'transform', 'condition', 'output']);

export const TransformOperationSchema = z.enum([
  'trim',
  'lowercase',
  'uppercase',
  'extract_field',
  'json_parse',
  'template',
]);

export const ConditionOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
  'is_empty',
  'is_not_empty',
]);

export const WorkflowNodeDataSchema = z.object({
  label: z.string().min(1, 'Node label is required').max(100),
  nodeType: NodeTypeSchema,
  config: z.record(z.any()).default({}),
  status: z.enum(['idle', 'pending', 'running', 'succeeded', 'failed', 'skipped']).optional(),
  lastRun: z
    .object({
      output: z.any().optional(),
      error: z.string().optional(),
      durationMs: z.number().optional(),
      executedAt: z.string().optional(),
    })
    .optional(),
});

export const WorkflowNodeSchema = z.object({
  id: z.string().min(1, 'Node id required'),
  type: NodeTypeSchema,
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: WorkflowNodeDataSchema,
});

export const WorkflowEdgeSchema = z.object({
  id: z.string().min(1, 'Edge id required'),
  source: z.string().min(1, 'Edge source required'),
  target: z.string().min(1, 'Edge target required'),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  label: z.string().optional(),
});

export const WorkflowGraphSchema = z.object({
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
});

export const WorkflowUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  expectedRevision: z.number().int().nonnegative(),
  graph: WorkflowGraphSchema,
});

export const ExecutionStartSchema = z.object({
  workflowId: z.string().min(1),
  input: z.record(z.any()).optional(),
});

export const ProjectCreateSchema = z.object({
  name: z.string().min(1, 'Project name required').max(100),
});
