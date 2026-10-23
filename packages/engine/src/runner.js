import { validateGraphForExecution } from './validator';
import { buildExecutionPlan } from './scheduler';
import { evaluateTrigger } from './evaluators/trigger';
import { evaluateTransform } from './evaluators/transform';
import { evaluateCondition } from './evaluators/condition';
import { evaluateOutput } from './evaluators/output';
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function runWorkflow(graph, options = {}) {
    const startTime = Date.now();
    const executionId = options.executionId || `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    // 1. Validation check
    const validation = validateGraphForExecution(graph);
    if (!validation.valid) {
        throw new Error(`Graph validation failed: ${validation.errors.join('; ')}`);
    }
    // 2. Build topological execution plan
    const plan = buildExecutionPlan(graph);
    const nodeMap = new Map();
    for (const node of graph.nodes) {
        nodeMap.set(node.id, node);
    }
    const steps = [];
    const nodeOutputs = new Map();
    const nodeStatuses = new Map();
    const inactiveEdges = new Set(); // Edge IDs that were turned off by condition branch decisions
    const finalOutputs = {};
    let overallStatus = 'succeeded';
    let failureError;
    for (const nodeId of plan.orderedNodeIds) {
        const node = nodeMap.get(nodeId);
        const incomingEdges = plan.incomingEdges.get(nodeId) || [];
        // Check if all incoming edges are inactive (skipped)
        const isRoot = incomingEdges.length === 0;
        const allIncomingInactive = !isRoot && incomingEdges.every(e => inactiveEdges.has(e.id));
        const anyParentFailed = incomingEdges.some(e => nodeStatuses.get(e.source) === 'failed');
        if (allIncomingInactive || anyParentFailed) {
            // Mark node as skipped
            const skippedStep = {
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
        let combinedInput = {};
        if (isRoot) {
            combinedInput = options.runtimeInput || {};
        }
        else {
            for (const edge of incomingEdges) {
                if (!inactiveEdges.has(edge.id) && nodeOutputs.has(edge.source)) {
                    const sourceOutput = nodeOutputs.get(edge.source);
                    if (typeof sourceOutput === 'object' && sourceOutput !== null) {
                        combinedInput = { ...combinedInput, ...sourceOutput };
                    }
                    else {
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
            let stepOutput;
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
                        }
                        else {
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
                    const config = (node.data?.config || {});
                    if (config.destination === 'integration' && config.integrationId && options.integrationInvoker) {
                        const invokerResult = await options.integrationInvoker(config.integrationId, combinedInput, config);
                        stepOutput = {
                            ...stepOutput,
                            _integrationResult: invokerResult
                        };
                    }
                    finalOutputs[node.id] = stepOutput;
                    break;
                }
                default:
                    throw new Error(`Unsupported node execution type: "${node.type}"`);
            }
            const stepDuration = Math.round(performance.now() - stepPerfStart);
            const completedStep = {
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
        }
        catch (err) {
            const stepDuration = Math.round(performance.now() - stepPerfStart);
            const errorMessage = err?.message || 'Node execution failed';
            const failedStep = {
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
//# sourceMappingURL=runner.js.map