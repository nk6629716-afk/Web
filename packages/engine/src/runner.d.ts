import { ExecutionStep, RelayGraph } from '@relay/shared';
export interface ExecuteOptions {
    executionId?: string;
    runtimeInput?: any;
    stepDelayMs?: number;
    onStepStart?: (step: Partial<ExecutionStep>) => void | Promise<void>;
    onStepComplete?: (step: ExecutionStep) => void | Promise<void>;
    onStepFailed?: (step: ExecutionStep) => void | Promise<void>;
    onStepSkipped?: (step: ExecutionStep) => void | Promise<void>;
}
export interface ExecutionSummary {
    executionId: string;
    status: 'succeeded' | 'failed';
    steps: ExecutionStep[];
    finalOutputs: Record<string, any>;
    durationMs: number;
    error?: string;
}
export declare function runWorkflow(graph: RelayGraph, options?: ExecuteOptions): Promise<ExecutionSummary>;
//# sourceMappingURL=runner.d.ts.map