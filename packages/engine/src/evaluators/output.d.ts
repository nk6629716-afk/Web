import { RelayNode } from '@relay/shared';
export interface OutputResult {
    output: Record<string, any>;
    summary: {
        nodeId: string;
        destination: string;
        label?: string;
        capturedAt: string;
        keys: string[];
    };
}
export declare function evaluateOutput(node: RelayNode, inputPayload: Record<string, any>): OutputResult;
//# sourceMappingURL=output.d.ts.map