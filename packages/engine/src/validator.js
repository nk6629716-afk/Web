import { validateGraphStructure } from '@relay/shared';
/**
 * Validates graph for execution readiness.
 * Returns valid: boolean and list of errors/warnings.
 */
export function validateGraphForExecution(graph, options = {}) {
    const baseResult = validateGraphStructure(graph);
    if (!baseResult.valid) {
        return baseResult;
    }
    const errors = [...baseResult.errors];
    const warnings = [...baseResult.warnings];
    const issues = [...baseResult.issues];
    const triggers = graph.nodes.filter(n => n.type === 'trigger');
    if (triggers.length === 0) {
        errors.push('Cannot execute workflow: No Trigger node found.');
        issues.push({ type: 'error', message: 'No Trigger node found' });
    }
    const outputs = graph.nodes.filter(n => n.type === 'output');
    if (options.requireOutput && outputs.length === 0) {
        errors.push('Workflow must contain at least one Output node to finish execution.');
        issues.push({ type: 'error', message: 'No Output node found' });
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        issues
    };
}
export { validateGraphStructure };
//# sourceMappingURL=validator.js.map