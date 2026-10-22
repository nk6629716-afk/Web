import { RelayNode } from '@relay/shared';

export interface TriggerResult {
  output: Record<string, any>;
}

export function evaluateTrigger(node: RelayNode, runtimeInput?: any): TriggerResult {
  const initialPayload = node.data?.config?.initialPayload || node.data?.config?.payload || {};
  
  // If runtime input is provided (e.g. from execution start request), merge it with initial payload
  let outputPayload: Record<string, any> = {};

  if (typeof initialPayload === 'object' && initialPayload !== null) {
    outputPayload = { ...initialPayload };
  } else {
    outputPayload = { payload: initialPayload };
  }

  if (runtimeInput && typeof runtimeInput === 'object') {
    outputPayload = { ...outputPayload, ...runtimeInput };
  } else if (runtimeInput !== undefined && runtimeInput !== null) {
    outputPayload.runtimeInput = runtimeInput;
  }

  return { output: outputPayload };
}
