import { WorkflowGraph } from './types';
/**
 * Recursively sanitizes a value to ensure it contains only pure, JSON-serializable primitives,
 * breaking any circular references and stripping functions, DOM nodes, and React fibers.
 */
export declare function sanitizePlainData<T = any>(val: T, seen?: WeakSet<object>): T;
/**
 * Pure DTO mapper for workflow graph nodes.
 * Extracts ONLY legitimate workflow data and strips all React Flow internals,
 * DOM instances, event handlers, and circular references.
 */
export declare function toWorkflowGraphDTO(nodes: any[], edges: any[]): WorkflowGraph;
/**
 * Sanitizes an existing WorkflowGraph object, ensuring it can be serialized without cycles.
 */
export declare function sanitizeWorkflowGraph(graph: any): WorkflowGraph;
/**
 * Resilient JSON stringifier that breaks cyclic objects using a WeakSet
 * rather than throwing "TypeError: Cyclic object value".
 */
export declare function safeJsonStringify(obj: any, space?: number): string;
//# sourceMappingURL=workflowSerializer.d.ts.map