import { Execution, ExecutionStep, NodeStatus, RelayGraph, RelayNode } from '@relay/shared';
import { validateGraphForExecution } from './validator';
import { buildExecutionPlan } from './scheduler';
import { evaluateTrigger } from './evaluators/trigger';
import { evaluateTransform } from './evaluators/transform';
import { evaluateCondition } from './evaluators/condition';
import { evaluateOutput } from './evaluators/output';

export interface ExecuteOptions {
  executionId?: string;
  runtimeInput?: any;
  stepDelayMs?: number; // Optional delay between steps for visual realism in demo/animation
  onStepStart?: (step: Partial<ExecutionStep>) => void | Promise<void>;
  onStepComplete?: (step: ExecutionStep) => void | Promise<void>;
  onStepFailed?: (step: ExecutionStep) => void | Promise<void>;
  onStepSkipped?: (step: ExecutionStep) => void | Promise<void>;
}

export interface ExecutionSummary {
  executionId: string;
  status: 'succeeded' | 'failed';
  steps: ExecutionStep[];
  finalOutputs: Record<string, any>;
  durationMs: number;
  error?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWorkflow(
  graph: RelayGraph,
  options: ExecuteOptions = {}
): Promise<ExecutionSummary> {
  const startTime = Date.now();
  const executionId = options.executionId || `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 1. Validation check
  const validation = validateGraphForExecution(graph);
  if (!validation.valid) {
    throw new Error(`Graph validation failed: ${validation.errors.join('; ')}`);
  }

  // 2. Build topological execution plan
  const plan = buildExecutionPlan(graph);
  const nodeMap = new Map<string, RelayNode>();
  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
  }

  const steps: ExecutionStep[] = [];
  const nodeOutputs = new Map<string, any>();
  const nodeStatuses = new Map<string, NodeStatus>();
  const inactiveEdges = new Set<string>(); // Edge IDs that were turned off by condition branch decisions
  const finalOutputs: Record<string, any> = {};

  let overallStatus: 'succeeded' | 'failed' = 'succeeded';
  let failureError: string | undefined;

  for (const nodeId of plan.orderedNodeIds) {
    const node = nodeMap.get(nodeId)!;
    const incomingEdges = plan.incomingEdges.get(nodeId) || [];

    // Check if all incoming edges are inactive (skipped)
    const isRoot = incomingEdges.length === 0;
    const allIncomingInactive = !isRoot && incomingEdges.every(e => inactiveEdges.has(e.id));
    const anyParentFailed = incomingEdges.some(e => nodeStatuses.get(e.source) === 'failed');

    if (allIncomingInactive || anyParentFailed) {
      // Mark node as skipped
      const skippedStep: ExecutionStep = {
        id: `step-${executionId}-${nodeId}`,
        executionId,
        nodeId,
        status: 'skipped',
        durationMs: 0,
        errorMessage: anyParentFailed ? 'Skipped due to upstream node failure' : 'Skipped branch'
      };
      nodeStatuses.set(nodeId, 'skipped');
      steps.push(skippedStep);

      // Deactivate all outgoing edges from this skipped node
      for (const outEdge of plan.outgoingEdges.get(nodeId) || []) {
        inactiveEdges.add(outEdge.id);
      }

      if (options.onStepSkipped) {
        await options.onStepSkipped(skippedStep);
      }
      continue;
    }

    // Node is active: prepare input
    let combinedInput: Record<string, any> = {};
    if (isRoot) {
      combinedInput = options.runtimeInput || {};
    } else {
      for (const edge of incomingEdges) {
        if (!inactiveEdges.has(edge.id) && nodeOutputs.has(edge.source)) {
          const sourceOutput = nodeOutputs.get(edge.source);
          if (typeof sourceOutput === 'object' && sourceOutput !== null) {
            combinedInput = { ...combinedInput, ...sourceOutput };
          } else {
            combinedInput[edge.source] = sourceOutput;
          }
        }
      }
    }

    // Step start
    const stepStartTimestamp = Date.now();
    nodeStatuses.set(nodeId, 'running');
    if (options.onStepStart) {
      await options.onStepStart({
        id: `step-${executionId}-${nodeId}`,
        executionId,
        nodeId,
        status: 'running',
        input: combinedInput,
        startedAt: new Date(stepStartTimestamp).toISOString()
      });
    }

    if (options.stepDelayMs && options.stepDelayMs > 0) {
      await delay(options.stepDelayMs);
    }

    const stepPerfStart = performance.now();
    try {
      let stepOutput: any;

      switch (node.type) {
        case 'trigger': {
          const res = evaluateTrigger(node, combinedInput);
          stepOutput = res.output;
          break;
        }

        case 'transform': {
          const res = evaluateTransform(node, combinedInput);
          stepOutput = res.output;
          break;
        }

        case 'condition': {
          const res = evaluateCondition(node, combinedInput);
          stepOutput = res.output;

          // Branch routing: inspect conditionMet
          const outgoing = plan.outgoingEdges.get(nodeId) || [];
          for (const edge of outgoing) {
            const handle = edge.sourceHandle;
            if (res.conditionMet) {
              // True branch active: disable false handle edges
              if (handle === 'false') {
                inactiveEdges.add(edge.id);
              }
            } else {
              // False branch active: disable true handle edges
              if (handle === 'true') {
                inactiveEdges.add(edge.id);
              }
            }
          }
          break;
        }

        case 'output': {
          const res = evaluateOutput(node, combinedInput);
          stepOutput = res.output;
          finalOutputs[node.id] = stepOutput;
          break;
        }

        default:
          throw new Error(`Unsupported node execution type: "${node.type}"`);
      }

      const stepDuration = Math.round(performance.now() - stepPerfStart);
      const completedStep: ExecutionStep = {
        id: `step-${executionId}-${nodeId}`,
        executionId,
        nodeId,
        status: 'succeeded',
        input: combinedInput,
        output: stepOutput,
        durationMs: stepDuration,
        startedAt: new Date(stepStartTimestamp).toISOString(),
        finishedAt: new Date().toISOString()
      };

      nodeOutputs.set(nodeId, stepOutput);
      nodeStatuses.set(nodeId, 'succeeded');
      steps.push(completedStep);

      if (options.onStepComplete) {
        await options.onStepComplete(completedStep);
      }
    } catch (err: any) {
      const stepDuration = Math.round(performance.now() - stepPerfStart);
      const errorMessage = err?.message || 'Node execution failed';
      const failedStep: ExecutionStep = {
        id: `step-${executionId}-${nodeId}`,
        executionId,
        nodeId,
        status: 'failed',
        input: combinedInput,
        errorMessage,
        durationMs: stepDuration,
        startedAt: new Date(stepStartTimestamp).toISOString(),
        finishedAt: new Date().toISOString()
      };

      nodeStatuses.set(nodeId, 'failed');
      steps.push(failedStep);
      overallStatus = 'failed';
      failureError = errorMessage;

      // Deactivate all outgoing edges from failed node
      for (const outEdge of plan.outgoingEdges.get(nodeId) || []) {
        inactiveEdges.add(outEdge.id);
      }

      if (options.onStepFailed) {
        await options.onStepFailed(failedStep);
      }
    }
  }

  const totalDurationMs = Date.now() - startTime;

  return {
    executionId,
    status: overallStatus,
    steps,
    finalOutputs,
    durationMs: totalDurationMs,
    error: failureError
  };
}
