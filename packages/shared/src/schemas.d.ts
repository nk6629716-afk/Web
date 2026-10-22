import { NodeType, RelayGraph, TransformOp, ConditionOp } from './types';
export interface ValidationIssue {
    type: 'error' | 'warning';
    nodeId?: string;
    edgeId?: string;
    message: string;
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    issues: ValidationIssue[];
}
export declare const SUPPORTED_NODE_TYPES: NodeType[];
export declare const SUPPORTED_TRANSFORM_OPS: TransformOp[];
export declare const SUPPORTED_CONDITION_OPS: ConditionOp[];
/**
 * Validates graph structure, edge references, node types, and basic connectivity.
 */
export declare function validateGraphStructure(graph: RelayGraph): ValidationResult;
//# sourceMappingURL=schemas.d.ts.map