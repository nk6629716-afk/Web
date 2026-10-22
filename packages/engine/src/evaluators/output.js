export function evaluateOutput(node, inputPayload) {
    const config = (node.data?.config || {});
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
//# sourceMappingURL=output.js.map