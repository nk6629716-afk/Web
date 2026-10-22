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
  const config = (node.data?.config || {}) as OutputConfig;
  const destination = config.destination || 'response';
  const label = config.label || node.data?.label || 'Output';

  const outputPayload = {
    ...inputPayload,
    _relayMetadata: {
      deliveredTo: destination,
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
      keys: Object.keys(inputPayload || {})
    }
  };
}
