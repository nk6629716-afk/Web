import { NodeType, WorkflowGraph, WorkflowNode, WorkflowEdge } from './types';

/**
 * Checks whether a value is a plain object or array.
 */
function isPlainObject(val: any): boolean {
  if (val === null || typeof val !== 'object') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively sanitizes a value to ensure it contains only pure, JSON-serializable primitives,
 * breaking any circular references and stripping functions, DOM nodes, and React fibers.
 */
export function sanitizePlainData<T = any>(val: T, seen = new WeakSet()): T {
  if (val === null || val === undefined) {
    return val;
  }

  const type = typeof val;

  // Primitives
  if (type === 'string' || type === 'number' || type === 'boolean') {
    if (typeof val === 'number' && !Number.isFinite(val)) {
      return 0 as any;
    }
    return val;
  }

  // Strip functions, symbols, and bigints
  if (type === 'function' || type === 'symbol' || type === 'bigint') {
    return undefined as any;
  }

  if (typeof val === 'object') {
    // Detect circular reference
    if (seen.has(val as any)) {
      return undefined as any;
    }
    seen.add(val as any);

    // Strip DOM elements, Window, and Document
    if (
      (typeof (val as any).nodeType === 'number' && typeof (val as any).nodeName === 'string') ||
      (typeof (val as any).window !== 'undefined' && (val as any).window === val) ||
      (typeof (val as any).ownerDocument !== 'undefined')
    ) {
      return undefined as any;
    }

    // Strip React elements / fibers ($$typeof)
    if ((val as any).$$typeof) {
      return undefined as any;
    }

    // Handle Arrays
    if (Array.isArray(val)) {
      const sanitizedArray: any[] = [];
      for (const item of val) {
        const cleaned = sanitizePlainData(item, seen);
        if (cleaned !== undefined) {
          sanitizedArray.push(cleaned);
        }
      }
      return sanitizedArray as any;
    }

    // Handle Plain Objects
    const sanitizedObj: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      // Skip React Flow and React internal properties
      if (
        key.startsWith('__') ||
        key.startsWith('_react') ||
        key === 'ref' ||
        key === '_owner' ||
        key === 'internals' ||
        key === 'measured'
      ) {
        continue;
      }

      const propVal = (val as any)[key];
      const cleaned = sanitizePlainData(propVal, seen);
      if (cleaned !== undefined) {
        sanitizedObj[key] = cleaned;
      }
    }

    return sanitizedObj as any;
  }

  return undefined as any;
}

/**
 * Pure DTO mapper for workflow graph nodes.
 * Extracts ONLY legitimate workflow data and strips all React Flow internals,
 * DOM instances, event handlers, and circular references.
 */
export function toWorkflowGraphDTO(nodes: any[], edges: any[]): WorkflowGraph {
  const safeNodes: WorkflowNode[] = (nodes || []).map((n) => {
    const rawData = n?.data || {};
    const rawConfig = rawData?.config || {};

    // Validate type
    const validTypes: NodeType[] = ['trigger', 'transform', 'condition', 'output'];
    const type: NodeType = validTypes.includes(n?.type) ? n.type : 'trigger';

    // Position coordinates (ensure finite numbers)
    const position = {
      x: Number.isFinite(n?.position?.x) ? Number(n.position.x) : 0,
      y: Number.isFinite(n?.position?.y) ? Number(n.position.y) : 0,
    };

    // Clean data configuration (stripping circular references, DOM, functions)
    const cleanConfig = sanitizePlainData(rawConfig) || {};

    const cleanData: WorkflowNode['data'] = {
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

  const safeEdges: WorkflowEdge[] = (edges || []).map((e) => {
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
export function sanitizeWorkflowGraph(graph: any): WorkflowGraph {
  if (!graph || typeof graph !== 'object') {
    return { nodes: [], edges: [] };
  }
  return toWorkflowGraphDTO(graph.nodes || [], graph.edges || []);
}

/**
 * Resilient JSON stringifier that breaks cyclic objects using a WeakSet
 * rather than throwing "TypeError: Cyclic object value".
 */
export function safeJsonStringify(obj: any, space?: number): string {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    },
    space
  );
}
