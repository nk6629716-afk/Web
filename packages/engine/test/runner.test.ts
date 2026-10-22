import { describe, it, expect } from 'vitest';
import { RelayGraph, SEEDED_SAMPLE_WORKFLOW } from '@relay/shared';
import { runWorkflow } from '../src/runner';

describe('Workflow Runner', () => {
  it('executes a linear workflow and computes real outputs', async () => {
    const graph: RelayGraph = {
      nodes: [
        {
          id: 'n1',
          type: 'trigger',
          position: { x: 0, y: 0 },
          data: {
            label: 'Trigger',
            type: 'trigger',
            config: { initialPayload: { user: 'Alice', greeting: '  hello  ' } }
          }
        },
        {
          id: 'n2',
          type: 'transform',
          position: { x: 100, y: 0 },
          data: {
            label: 'Trim',
            type: 'transform',
            config: { operation: 'trim', fieldPath: 'greeting', targetField: 'cleanGreeting' }
          }
        },
        {
          id: 'n3',
          type: 'transform',
          position: { x: 200, y: 0 },
          data: {
            label: 'Uppercase',
            type: 'transform',
            config: { operation: 'uppercase', fieldPath: 'cleanGreeting', targetField: 'finalGreeting' }
          }
        },
        {
          id: 'n4',
          type: 'output',
          position: { x: 300, y: 0 },
          data: {
            label: 'Output',
            type: 'output',
            config: { destination: 'response' }
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' }
      ]
    };

    const summary = await runWorkflow(graph);
    expect(summary.status).toBe('succeeded');
    expect(summary.steps.length).toBe(4);
    expect(summary.steps.every(s => s.status === 'succeeded')).toBe(true);

    const outputNodeResult = summary.finalOutputs['n4'];
    expect(outputNodeResult).toBeDefined();
    expect(outputNodeResult.finalGreeting).toBe('HELLO');
    expect(outputNodeResult.user).toBe('Alice');
  });

  it('routes to true branch and skips false branch on condition met', async () => {
    const graph: RelayGraph = {
      nodes: [
        {
          id: 'trig',
          type: 'trigger',
          position: { x: 0, y: 0 },
          data: {
            label: 'Trigger',
            type: 'trigger',
            config: { initialPayload: { role: 'admin' } }
          }
        },
        {
          id: 'cond',
          type: 'condition',
          position: { x: 100, y: 0 },
          data: {
            label: 'Check Admin',
            type: 'condition',
            config: { fieldPath: 'role', operator: 'equals', targetValue: 'admin' }
          }
        },
        {
          id: 'true-branch',
          type: 'transform',
          position: { x: 200, y: -50 },
          data: {
            label: 'Admin Transform',
            type: 'transform',
            config: { operation: 'template', template: 'Welcome Administrator!', targetField: 'msg' }
          }
        },
        {
          id: 'false-branch',
          type: 'transform',
          position: { x: 200, y: 50 },
          data: {
            label: 'User Transform',
            type: 'transform',
            config: { operation: 'template', template: 'Welcome Regular User!', targetField: 'msg' }
          }
        },
        {
          id: 'out-true',
          type: 'output',
          position: { x: 300, y: -50 },
          data: { label: 'Admin Out', type: 'output', config: { destination: 'response' } }
        },
        {
          id: 'out-false',
          type: 'output',
          position: { x: 300, y: 50 },
          data: { label: 'User Out', type: 'output', config: { destination: 'response' } }
        }
      ],
      edges: [
        { id: 'e-in', source: 'trig', target: 'cond' },
        { id: 'e-true', source: 'cond', target: 'true-branch', sourceHandle: 'true' },
        { id: 'e-false', source: 'cond', target: 'false-branch', sourceHandle: 'false' },
        { id: 'e-out-t', source: 'true-branch', target: 'out-true' },
        { id: 'e-out-f', source: 'false-branch', target: 'out-false' }
      ]
    };

    const summary = await runWorkflow(graph);
    expect(summary.status).toBe('succeeded');

    const trueStep = summary.steps.find(s => s.nodeId === 'true-branch');
    const falseStep = summary.steps.find(s => s.nodeId === 'false-branch');
    const outFalseStep = summary.steps.find(s => s.nodeId === 'out-false');

    expect(trueStep?.status).toBe('succeeded');
    expect(falseStep?.status).toBe('skipped');
    expect(outFalseStep?.status).toBe('skipped');

    expect(summary.finalOutputs['out-true']?.msg).toBe('Welcome Administrator!');
    expect(summary.finalOutputs['out-false']).toBeUndefined();
  });

  it('captures step errors gracefully and halts downstream execution', async () => {
    const graph: RelayGraph = {
      nodes: [
        {
          id: 'n1',
          type: 'trigger',
          position: { x: 0, y: 0 },
          data: {
            label: 'T',
            type: 'trigger',
            config: {
              initialPayload: { badJson: '{invalid-json' }
            }
          }
        },
        {
          id: 'n2',
          type: 'transform',
          position: { x: 100, y: 0 },
          data: {
            label: 'Fail Parse',
            type: 'transform',
            config: { operation: 'json_parse', fieldPath: 'badJson', targetField: 'res' }
          }
        },
        {
          id: 'n3',
          type: 'output',
          position: { x: 200, y: 0 },
          data: { label: 'O', type: 'output', config: { destination: 'response' } }
        }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' }
      ]
    };

    const summary = await runWorkflow(graph);
    expect(summary.status).toBe('failed');
    
    const step2 = summary.steps.find(s => s.nodeId === 'n2');
    expect(step2?.status).toBe('failed');
    expect(step2?.errorMessage).toContain('Invalid JSON string');

    const step3 = summary.steps.find(s => s.nodeId === 'n3');
    expect(step3?.status).toBe('skipped');
  });

  it('executes the SEEDED_SAMPLE_WORKFLOW end-to-end as E-Commerce Refund Router', async () => {
    const summary = await runWorkflow(SEEDED_SAMPLE_WORKFLOW.graph);
    expect(summary.status).toBe('succeeded');

    // Transform node: "  RAHUL SHARMA  " → "rahul sharma"
    const transformStep = summary.steps.find(s => s.nodeId === 'node-transform-1');
    expect(transformStep?.status).toBe('succeeded');
    expect(transformStep?.output?.cleanCustomer).toBe('rahul sharma');

    // Condition node: amount (12500) > 10000 → true branch active
    const conditionStep = summary.steps.find(s => s.nodeId === 'node-condition-1');
    expect(conditionStep?.status).toBe('succeeded');
    expect(conditionStep?.output?._conditionResult?.conditionMet).toBe(true);

    // VIP Fast-Track Approval output (true branch) — must have succeeded
    const vipOut = summary.finalOutputs['node-output-vip'];
    expect(vipOut).toBeDefined();
    expect(vipOut.status).toBe('APPROVED_VIP');
    expect(vipOut.priority).toBe('HIGH');
    expect(vipOut.customer).toBe('rahul sharma');
    expect(vipOut.orderId).toBe('ORD-9912');

    // Standard Review Queue (false branch) — must be skipped
    const standardStep = summary.steps.find(s => s.nodeId === 'node-output-standard');
    expect(standardStep?.status).toBe('skipped');
    expect(summary.finalOutputs['node-output-standard']).toBeUndefined();
  });
});
