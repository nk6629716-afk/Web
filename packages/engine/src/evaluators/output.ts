import { OutputConfig, RelayNode } from '@relay/shared';

export interface OutputResult {
  output: Record<string, any>;
  summary: {
    nodeId: string;
    destination: string;
    label?: string;
    capturedAt: string;
    keys: string[];
  };
}

export function evaluateOutput(node: RelayNode, inputPayload: Record<string, any>): OutputResult {
  const config = (node.data?.config || {}) as OutputConfig & { actionType?: string };
  const destination = config.destination || 'response';
  const label = config.label || node.data?.label || 'Output';
  const actionType = (config as any).actionType;

  // Build domain-specific output for E-Commerce Refund Router
  let domainOutput: Record<string, any>;

  if (actionType === 'AUTO_APPROVE') {
    // VIP Fast-Track Approval path
    domainOutput = {
      status: 'APPROVED_VIP',
      action: 'Auto-refund issued within 1 hour',
      customer: inputPayload.cleanCustomer || inputPayload.customer,
      orderId: inputPayload.orderId,
      amount: inputPayload.amount,
      reason: inputPayload.reason,
      priority: 'HIGH'
    };
  } else if (actionType === 'MANUAL_REVIEW') {
    // Standard Review Queue path
    domainOutput = {
      status: 'QUEUED_MANUAL_REVIEW',
      action: 'Escalated to customer service representative',
      customer: inputPayload.cleanCustomer || inputPayload.customer,
      orderId: inputPayload.orderId,
      amount: inputPayload.amount,
      reason: inputPayload.reason,
      priority: 'NORMAL'
    };
  } else {
    // Generic output: pass through the full input payload
    domainOutput = { ...inputPayload };
  }

  const outputPayload = {
    ...domainOutput,
    _relayMetadata: {
      deliveredTo: destination === 'integration' && (config as any).integrationId ? `integration:${(config as any).integrationId}` : destination,
      label,
      deliveredAt: new Date().toISOString()
    }
  };

  return {
    output: outputPayload,
    summary: {
      nodeId: node.id,
      destination,
      label,
      capturedAt: new Date().toISOString(),
      keys: Object.keys(domainOutput)
    }
  };
}
