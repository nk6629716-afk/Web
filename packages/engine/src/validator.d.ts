import { RelayGraph, ValidationResult, validateGraphStructure } from '@relay/shared';
export interface GraphValidationOptions {
    requireOutput?: boolean;
    allowDisconnectedComponents?: boolean;
}
/**
 * Validates graph for execution readiness.
 * Returns valid: boolean and list of errors/warnings.
 */
export declare function validateGraphForExecution(graph: RelayGraph, options?: GraphValidationOptions): ValidationResult;
export { validateGraphStructure };
//# sourceMappingURL=validator.d.ts.map