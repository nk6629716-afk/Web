export function evaluateTrigger(node, runtimeInput) {
    const initialPayload = node.data?.config?.initialPayload || {};
    // If runtime input is provided (e.g. from execution start request), merge it with initial payload
    let outputPayload = {};
    if (typeof initialPayload === 'object' && initialPayload !== null) {
        outputPayload = { ...initialPayload };
    }
    else {
        outputPayload = { payload: initialPayload };
    }
    if (runtimeInput && typeof runtimeInput === 'object') {
        outputPayload = { ...outputPayload, ...runtimeInput };
    }
    else if (runtimeInput !== undefined && runtimeInput !== null) {
        outputPayload.runtimeInput = runtimeInput;
    }
    return { output: outputPayload };
}
//# sourceMappingURL=trigger.js.map