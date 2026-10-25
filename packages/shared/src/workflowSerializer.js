/**
 * Checks whether a value is a plain object or array.
 */
function isPlainObject(val) {
    if (val === null || typeof val !== 'object')
        return false;
    const proto = Object.getPrototypeOf(val);
    return proto === Object.prototype || proto === null;
}
/**
 * Recursively sanitizes a value to ensure it contains only pure, JSON-serializable primitives,
 * breaking any circular references and stripping functions, DOM nodes, and React fibers.
 */
export function sanitizePlainData(val, seen = new WeakSet()) {
    if (val === null || val === undefined) {
        return val;
    }
    const type = typeof val;
    // Primitives
    if (type === 'string' || type === 'number' || type === 'boolean') {
        if (typeof val === 'number' && !Number.isFinite(val)) {
            return 0;
        }
        return val;
    }
    // Strip functions, symbols, and bigints
    if (type === 'function' || type === 'symbol' || type === 'bigint') {
        return undefined;
    }
    if (typeof val === 'object') {
        // Detect circular reference
        if (seen.has(val)) {
            return undefined;
        }
        seen.add(val);
        // Strip DOM elements, Window, and Document
        if ((typeof val.nodeType === 'number' && typeof val.nodeName === 'string') ||
            (typeof val.window !== 'undefined' && val.window === val) ||
            (typeof val.ownerDocument !== 'undefined')) {
            return undefined;
        }
        // Strip React elements / fibers ($$typeof)
        if (val.$$typeof) {
            return undefined;
        }
        // Handle Arrays
        if (Array.isArray(val)) {
            const sanitizedArray = [];
            for (const item of val) {
                const cleaned = sanitizePlainData(item, seen);
                if (cleaned !== undefined) {
                    sanitizedArray.push(cleaned);
                }
            }
            return sanitizedArray;
        }
        // Handle Plain Objects
        const sanitizedObj = {};
        for (const key of Object.keys(val)) {
            // Skip React Flow and React internal properties
            if (key.startsWith('__') ||
                key.startsWith('_react') ||
                key === 'ref' ||
                key === '_owner' ||
                key === 'internals' ||
                key === 'measured') {
                continue;
            }
            const propVal = val[key];
            const cleaned = sanitizePlainData(propVal, seen);
            if (cleaned !== undefined) {
                sanitizedObj[key] = cleaned;
            }
        }
        return sanitizedObj;
    }
    return undefined;
}
/**
 * Pure DTO mapper for workflow graph nodes.
 * Extracts ONLY legitimate workflow data and strips all React Flow internals,
 * DOM instances, event handlers, and circular references.
 */
export function toWorkflowGraphDTO(nodes, edges) {
    const safeNodes = (nodes || []).map((n) => {
        const rawData = n?.data || {};
        const rawConfig = rawData?.config || {};
        // Validate type
        const validTypes = ['trigger', 'transform', 'condition', 'output'];
        const type = validTypes.includes(n?.type) ? n.type : 'trigger';
        // Position coordinates (ensure finite numbers)
        const position = {
            x: Number.isFinite(n?.position?.x) ? Number(n.position.x) : 0,
            y: Number.isFinite(n?.position?.y) ? Number(n.position.y) : 0,
        };
        // Clean data configuration (stripping circular references, DOM, functions)
        const cleanConfig = sanitizePlainData(rawConfig) || {};
        const cleanData = {
            label: typeof rawData.label === 'string' && rawData.label.trim() ? rawData.label : `${type.toUpperCase()} Node`,
            type: type,
            nodeType: type,
            config: cleanConfig,
        };
        // Preserve status if valid
        const validStatuses = ['idle', 'running', 'succeeded', 'failed', 'skipped'];
        if (rawData.status && validStatuses.includes(rawData.status)) {
            cleanData.status = rawData.status;
        }
        return {
            id: String(n?.id || `node-${type}-${Date.now()}`),
            type,
            position,
            data: cleanData,
        };
    });
    const safeEdges = (edges || []).map((e) => {
        return {
            id: String(e?.id || `edge-${Date.now()}`),
            source: String(e?.source || ''),
            target: String(e?.target || ''),
            sourceHandle: typeof e?.sourceHandle === 'string' ? e.sourceHandle : undefined,
            targetHandle: typeof e?.targetHandle === 'string' ? e.targetHandle : undefined,
            label: typeof e?.label === 'string' ? e.label : undefined,
        };
    });
    return {
        nodes: safeNodes,
        edges: safeEdges,
    };
}
/**
 * Sanitizes an existing WorkflowGraph object, ensuring it can be serialized without cycles.
 */
export function sanitizeWorkflowGraph(graph) {
    if (!graph || typeof graph !== 'object') {
        return { nodes: [], edges: [] };
    }
    return toWorkflowGraphDTO(graph.nodes || [], graph.edges || []);
}
/**
 * Resilient JSON stringifier that breaks cyclic objects using a WeakSet
 * rather than throwing "TypeError: Cyclic object value".
 */
export function safeJsonStringify(obj, space) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    }, space);
}
//# sourceMappingURL=workflowSerializer.js.map