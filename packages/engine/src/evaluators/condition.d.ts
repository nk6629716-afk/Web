import { RelayNode } from '@relay/shared';
export interface ConditionResult {
    conditionMet: boolean;
    output: Record<string, any>;
    evaluatedField: string;
    actualValue: any;
    targetValue: any;
    operator: string;
}
export declare function evaluateCondition(node: RelayNode, inputPayload: Record<string, any>): ConditionResult;
//# sourceMappingURL=condition.d.ts.map