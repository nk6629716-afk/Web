import { Workflow } from './types';

/**
 * RELAY — E-Commerce Order & Refund Router
 *
 * Pre-seeded demo workflow:
 *   Trigger → Transform (trim_and_lowercase) → Condition (amount > 10000)
 *             → [true]  Output: VIP Fast-Track Approval
 *             → [false] Output: Standard Review Queue
 *
 * Default payload: ORD-9912, amount: 12500, customer: "  RAHUL SHARMA  "
 */
export const SEEDED_SAMPLE_WORKFLOW: Workflow = {
  id: 'demo-workflow-001',
  projectId: 'demo-project-001',
  name: 'E-Commerce Refund Router',
  revision: 1,
  updatedAt: new Date().toISOString(),
  graph: {
    nodes: [
      {
        id: 'node-trigger-1',
        type: 'trigger',
        position: { x: 80, y: 240 },
        data: {
          label: 'Incoming Refund Request',
          type: 'trigger',
          config: {
            triggerType: 'webhook',
            initialPayload: {
              orderId: 'ORD-9912',
              amount: 12500,
              customer: '  RAHUL SHARMA  ',
              reason: 'Defective item received'
            }
          },
          status: 'idle'
        }
      },
      {
        id: 'node-transform-1',
        type: 'transform',
        position: { x: 400, y: 240 },
        data: {
          label: 'Sanitize Customer Name',
          type: 'transform',
          config: {
            operation: 'trim_and_lowercase',
            fieldPath: 'customer',
            targetField: 'cleanCustomer'
          },
          status: 'idle'
        }
      },
      {
        id: 'node-condition-1',
        type: 'condition',
        position: { x: 720, y: 240 },
        data: {
          label: 'High Value Order Check',
          type: 'condition',
          config: {
            fieldPath: 'amount',
            operator: 'greater_than',
            targetValue: 10000
          },
          status: 'idle'
        }
      },
      {
        id: 'node-output-vip',
        type: 'output',
        position: { x: 1040, y: 100 },
        data: {
          label: 'VIP Fast-Track Approval',
          type: 'output',
          config: {
            destination: 'response',
            label: 'VIP Fast-Track Approval',
            actionType: 'AUTO_APPROVE'
          },
          status: 'idle'
        }
      },
      {
        id: 'node-output-standard',
        type: 'output',
        position: { x: 1040, y: 380 },
        data: {
          label: 'Standard Review Queue',
          type: 'output',
          config: {
            destination: 'response',
            label: 'Standard Review Queue',
            actionType: 'MANUAL_REVIEW'
          },
          status: 'idle'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-trigger-1',
        target: 'node-transform-1',
        label: 'Refund Payload'
      },
      {
        id: 'edge-2',
        source: 'node-transform-1',
        target: 'node-condition-1',
        label: 'Sanitized'
      },
      {
        id: 'edge-3-true',
        source: 'node-condition-1',
        target: 'node-output-vip',
        sourceHandle: 'true',
        label: 'True (> 10000)'
      },
      {
        id: 'edge-3-false',
        source: 'node-condition-1',
        target: 'node-output-standard',
        sourceHandle: 'false',
        label: 'False (≤ 10000)'
      }
    ]
  }
};
