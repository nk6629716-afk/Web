export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuid(id) {
    return typeof id === 'string' && UUID_REGEX.test(id);
}
export const SUPPORTED_NODE_TYPES = ['trigger', 'transform', 'condition', 'output'];
export const SUPPORTED_TRANSFORM_OPS = [
    'trim',
    'lowercase',
    'uppercase',
    'json_parse',
    'json_stringify',
    'extract_field',
    'template',
    'math_add',
    'default_value'
];
export const SUPPORTED_CONDITION_OPS = [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'greater_than',
    'less_than',
    'is_empty',
    'is_not_empty'
];
/**
 * Validates graph structure, edge references, node types, and basic connectivity.
 */
export function validateGraphStructure(graph) {
    const issues = [];
    const errors = [];
    const warnings = [];
    const addError = (message, nodeId, edgeId) => {
        errors.push(message);
        issues.push({ type: 'error', message, nodeId, edgeId });
    };
    const addWarning = (message, nodeId, edgeId) => {
        warnings.push(message);
        issues.push({ type: 'warning', message, nodeId, edgeId });
    };
    if (!graph || !Array.isArray(graph.nodes)) {
        addError('Graph must contain a nodes array');
        return { valid: false, errors, warnings, issues };
    }
    const nodeMap = new Map();
    const duplicateIds = new Set();
    // Check nodes
    for (const node of graph.nodes) {
        if (!node.id) {
            addError('Node is missing required ID');
            continue;
        }
        if (nodeMap.has(node.id)) {
            duplicateIds.add(node.id);
            addError(`Duplicate node ID detected: "${node.id}"`, node.id);
        }
        nodeMap.set(node.id, node);
        if (!SUPPORTED_NODE_TYPES.includes(node.type)) {
            addError(`Unsupported node type: "${node.type}". Supported: ${SUPPORTED_NODE_TYPES.join(', ')}`, node.id);
        }
        // Node-specific configuration checks
        if (node.type === 'transform') {
            const op = node.data?.config?.operation;
            if (!op || !SUPPORTED_TRANSFORM_OPS.includes(op)) {
                addWarning(`Transform node "${node.id}" has invalid or missing operation: "${op}"`, node.id);
            }
        }
        else if (node.type === 'condition') {
            const op = node.data?.config?.operator;
            if (!op || !SUPPORTED_CONDITION_OPS.includes(op)) {
                addWarning(`Condition node "${node.id}" has invalid or missing operator: "${op}"`, node.id);
            }
        }
    }
    // Check triggers and outputs
    const triggers = graph.nodes.filter(n => n.type === 'trigger');
    const outputs = graph.nodes.filter(n => n.type === 'output');
    if (triggers.length === 0) {
        addError('Workflow must have at least one Trigger node');
    }
    if (outputs.length === 0) {
        addWarning('Workflow should have at least one Output node to collect results');
    }
    // Check edges
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    for (const edge of edges) {
        if (!edge.id) {
            addError('Edge is missing required ID');
        }
        if (!edge.source || !nodeMap.has(edge.source)) {
            addError(`Edge "${edge.id}" references non-existent source node: "${edge.source}"`, undefined, edge.id);
        }
        if (!edge.target || !nodeMap.has(edge.target)) {
            addError(`Edge "${edge.id}" references non-existent target node: "${edge.target}"`, undefined, edge.id);
        }
        if (edge.source && edge.target && edge.source === edge.target) {
            addError(`Edge "${edge.id}" forms a self-loop on node "${edge.source}"`, edge.source, edge.id);
        }
        // Condition node edge handles check
        const sourceNode = nodeMap.get(edge.source);
        if (sourceNode?.type === 'condition') {
            if (edge.sourceHandle && !['true', 'false'].includes(edge.sourceHandle)) {
                addWarning(`Condition node edge "${edge.id}" has unusual sourceHandle: "${edge.sourceHandle}". Expected "true" or "false"`, edge.source, edge.id);
            }
        }
    }
    // Cycle detection via DFS
    const adjacencyList = new Map();
    for (const node of graph.nodes) {
        adjacencyList.set(node.id, []);
    }
    for (const edge of edges) {
        if (adjacencyList.has(edge.source) && nodeMap.has(edge.target)) {
            adjacencyList.get(edge.source).push(edge.target);
        }
    }
    const visited = new Set();
    const recursionStack = new Set();
    let hasCycle = false;
    function detectCycleDfs(nodeId, path) {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        const neighbors = adjacencyList.get(nodeId) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                if (detectCycleDfs(neighbor, [...path, neighbor])) {
                    return true;
                }
            }
            else if (recursionStack.has(neighbor)) {
                const cycle = [...path, neighbor].join(' -> ');
                addError(`Cycle detected in workflow graph: ${cycle}`, neighbor);
                return true;
            }
        }
        recursionStack.delete(nodeId);
        return false;
    }
    for (const node of graph.nodes) {
        if (!visited.has(node.id)) {
            if (detectCycleDfs(node.id, [node.id])) {
                hasCycle = true;
                break;
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        issues
    };
}
//# sourceMappingURL=schemas.js.map