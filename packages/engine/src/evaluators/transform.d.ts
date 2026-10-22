import { RelayNode } from '@relay/shared';
export interface TransformResult {
    output: Record<string, any>;
}
/**
 * Safely extracts a nested property using dot-notation path (e.g. 'user.profile.name')
 */
export declare function getNestedValue(obj: any, path: string): any;
/**
 * Safely sets a value at a target property name or shallow path
 */
export declare function setNestedValue(obj: Record<string, any>, path: string, value: any): Record<string, any>;
/**
 * Safely evaluates built-in transform operations.
 * Arbitrary JavaScript execution is strictly prevented.
 */
export declare function evaluateTransform(node: RelayNode, inputPayload: Record<string, any>): TransformResult;
//# sourceMappingURL=transform.d.ts.map