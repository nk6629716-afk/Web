import {
  ConditionConfig,
  Execution,
  ExecutionStepResult,
  NodeStatus,
  OutputConfig,
  TransformConfig,
  TriggerConfig,
  WorkflowGraph,
  WorkflowNode,
} from '@relay/shared';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateGraph(graph: WorkflowGraph): ValidationResult {
  const errors: string[] = [];

  if (!graph.nodes || graph.nodes.length === 0) {
    errors.push('Workflow must contain at least one node.');
    return { isValid: false, errors };
  }

  const nodeMap = new Map<string, WorkflowNode>();
  for (const node of graph.nodes) {
    if (nodeMap.has(node.id)) {
      errors.push(`Duplicate node ID detected: "${node.id}".`);
    }
    nodeMap.set(node.id, node);

    const validTypes = ['trigger', 'transform', 'condition', 'output'];
    if (!validTypes.includes(node.type)) {
      errors.push(`Node "${node.data.label || node.id}" has unsupported type: "${node.type}".`);
    }
  }

  const triggerNodes = graph.nodes.filter((n) => n.type === 'trigger');
  if (triggerNodes.length === 0) {
    errors.push('Workflow must have at least one Trigger node to start execution.');
  }

  // Validate edges
  for (const edge of graph.edges) {
    if (!nodeMap.has(edge.source)) {
      errors.push(`Edge references non-existent source node: "${edge.source}".`);
    }
    if (!nodeMap.has(edge.target)) {
      errors.push(`Edge references non-existent target node: "${edge.target}".`);
    }
  }

  // Detect cycles using DFS
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    if (adj.has(edge.source)) {
      adj.get(edge.source)!.push(edge.target);
    }
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();
  let hasCycle = false;

  function dfs(nodeId: string) {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        hasCycle = true;
        break;
      }
    }
  }

  if (hasCycle) {
    errors.push('Workflow contains a cycle (loop). Cyclic execution is not permitted.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function resolveTemplate(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    return context[trimmed] !== undefined ? String(context[trimmed]) : `{{${trimmed}}}`;
  });
}

export async function executeWorkflow(
  workflowId: string,
  graph: WorkflowGraph,
  onStepEvent?: (step: ExecutionStepResult) => void
): Promise<Execution> {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startedAt = new Date().toISOString();
  const steps: ExecutionStepResult[] = [];

  const validation = validateGraph(graph);
  if (!validation.isValid) {
    throw new Error(`Graph validation failed: ${validation.errors.join('; ')}`);
  }

  const nodeMap = new Map<string, WorkflowNode>(graph.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, { target: string; sourceHandle?: string | null }[]>();
  for (const node of graph.nodes) {
    outgoing.set(node.id, []);
  }
  for (const edge of graph.edges) {
    outgoing.get(edge.source)?.push({
      target: edge.target,
      sourceHandle: edge.sourceHandle,
    });
  }

  // Node inputs accumulator
  const nodeInputs = new Map<string, Record<string, any>>();
  const nodeStatuses = new Map<string, NodeStatus>();
  for (const node of graph.nodes) {
    nodeStatuses.set(node.id, 'pending');
  }

  const triggerNodes = graph.nodes.filter((n) => n.type === 'trigger');
  const executionQueue: string[] = triggerNodes.map((n) => n.id);

  // Mark non-reachable nodes initially as pending
  let executionError: string | undefined = undefined;

  while (executionQueue.length > 0) {
    const currentNodeId = executionQueue.shift()!;
    const node = nodeMap.get(currentNodeId);
    if (!node) continue;

    // Check if node was skipped
    if (nodeStatuses.get(currentNodeId) === 'skipped') {
      const stepResult: ExecutionStepResult = {
        id: `step_${currentNodeId}_${Date.now()}`,
        executionId,
        nodeId: currentNodeId,
        status: 'skipped',
        durationMs: 0,
      };
      steps.push(stepResult);
      if (onStepEvent) onStepEvent(stepResult);

      // Propagate skip to all outgoing targets
      const targets = outgoing.get(currentNodeId) || [];
      for (const t of targets) {
        if (nodeStatuses.get(t.target) !== 'succeeded') {
          nodeStatuses.set(t.target, 'skipped');
          executionQueue.push(t.target);
        }
      }
      continue;
    }

    // Step Running state
    nodeStatuses.set(currentNodeId, 'running');
    const runningStep: ExecutionStepResult = {
      id: `step_${currentNodeId}_${Date.now()}`,
      executionId,
      nodeId: currentNodeId,
      status: 'running',
      input: nodeInputs.get(currentNodeId) || {},
      durationMs: 0,
    };
    if (onStepEvent) onStepEvent(runningStep);

    // Realistic visual step execution delay (350ms)
    const stepStart = performance.now();
    await new Promise((r) => setTimeout(r, 350));

    let outputData: any = {};
    let stepStatus: NodeStatus = 'succeeded';
    let errorMessage: string | undefined = undefined;
    let chosenHandle: 'true' | 'false' | null = null;

    try {
      const currentInput = nodeInputs.get(currentNodeId) || {};

      switch (node.type) {
        case 'trigger': {
          const cfg = (node.data.config || {}) as TriggerConfig;
          if (typeof cfg.payload === 'string') {
            try {
              outputData = JSON.parse(cfg.payload);
            } catch {
              outputData = { raw: cfg.payload };
            }
          } else if (cfg.payload && typeof cfg.payload === 'object') {
            outputData = { ...cfg.payload };
          } else {
            outputData = { triggeredAt: new Date().toISOString(), ...currentInput };
          }
          break;
        }

        case 'transform': {
          const cfg = (node.data.config || {}) as TransformConfig;
          outputData = { ...currentInput };
          const targetField = cfg.field;
          const outField = cfg.outputField || targetField || 'transformed';

          if (cfg.operation === 'trim') {
            if (targetField && typeof currentInput[targetField] === 'string') {
              outputData[outField] = currentInput[targetField].trim();
            } else {
              for (const [k, v] of Object.entries(outputData)) {
                if (typeof v === 'string') outputData[k] = v.trim();
              }
            }
          } else if (cfg.operation === 'lowercase') {
            if (targetField && typeof currentInput[targetField] === 'string') {
              outputData[outField] = currentInput[targetField].toLowerCase();
            }
          } else if (cfg.operation === 'uppercase') {
            if (targetField && typeof currentInput[targetField] === 'string') {
              outputData[outField] = currentInput[targetField].toUpperCase();
            }
          } else if (cfg.operation === 'template') {
            outputData[outField] = resolveTemplate(cfg.template || '', currentInput);
          } else if (cfg.operation === 'extract_field') {
            outputData[outField] = targetField ? currentInput[targetField] : currentInput;
          }
          break;
        }

        case 'condition': {
          const cfg = (node.data.config || {}) as ConditionConfig;
          const leftVal = currentInput[cfg.field];
          const rightVal = cfg.value;
          let condPassed = false;

          if (cfg.operator === 'equals') {
            condPassed = String(leftVal) === String(rightVal);
          } else if (cfg.operator === 'not_equals') {
            condPassed = String(leftVal) !== String(rightVal);
          } else if (cfg.operator === 'contains') {
            condPassed = String(leftVal).includes(String(rightVal));
          } else if (cfg.operator === 'greater_than') {
            condPassed = Number(leftVal) > Number(rightVal);
          } else if (cfg.operator === 'less_than') {
            condPassed = Number(leftVal) < Number(rightVal);
          } else if (cfg.operator === 'is_empty') {
            condPassed = leftVal === null || leftVal === undefined || leftVal === '';
          } else if (cfg.operator === 'is_not_empty') {
            condPassed = leftVal !== null && leftVal !== undefined && leftVal !== '';
          }

          chosenHandle = condPassed ? 'true' : 'false';
          outputData = {
            ...currentInput,
            _conditionResult: condPassed,
            _branchTaken: chosenHandle,
          };
          break;
        }

        case 'output': {
          const cfg = (node.data.config || {}) as OutputConfig;
          const message = cfg.messageTemplate
            ? resolveTemplate(cfg.messageTemplate, currentInput)
            : 'Execution completed successfully.';
          outputData = {
            title: cfg.title || 'Workflow Output Result',
            message,
            payload: currentInput,
            timestamp: new Date().toISOString(),
          };
          break;
        }
      }
    } catch (err: any) {
      stepStatus = 'failed';
      errorMessage = err?.message || 'Execution error encountered in node.';
      executionError = errorMessage;
    }

    const durationMs = Math.round(performance.now() - stepStart);
    nodeStatuses.set(currentNodeId, stepStatus);

    const finishedStep: ExecutionStepResult = {
      id: `step_${currentNodeId}_${Date.now()}`,
      executionId,
      nodeId: currentNodeId,
      status: stepStatus,
      input: nodeInputs.get(currentNodeId),
      output: outputData,
      errorMessage,
      durationMs,
    };
    steps.push(finishedStep);
    if (onStepEvent) onStepEvent(finishedStep);

    if (stepStatus === 'failed') {
      break;
    }

    // Propagate output to outgoing targets
    const outEdges = outgoing.get(currentNodeId) || [];
    for (const edge of outEdges) {
      const targetId = edge.target;

      // Handle Condition node branch filtering
      if (node.type === 'condition' && chosenHandle) {
        if (edge.sourceHandle && edge.sourceHandle !== chosenHandle) {
          // This branch was NOT taken, mark downstream as skipped
          nodeStatuses.set(targetId, 'skipped');
          executionQueue.push(targetId);
          continue;
        }
      }

      // Merge payload
      const existing = nodeInputs.get(targetId) || {};
      nodeInputs.set(targetId, { ...existing, ...outputData });

      if (!executionQueue.includes(targetId)) {
        executionQueue.push(targetId);
      }
    }
  }

  const finishedAt = new Date().toISOString();
  const overallStatus = executionError ? 'failed' : 'succeeded';

  return {
    id: executionId,
    workflowId,
    status: overallStatus,
    steps,
    startedAt,
    finishedAt,
    error: executionError,
  };
}
