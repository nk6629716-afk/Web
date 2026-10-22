import { RelayGraph, RelayEdge } from '@relay/shared';
export interface ExecutionPlan {
    orderedNodeIds: string[];
    incomingEdges: Map<string, RelayEdge[]>;
    outgoingEdges: Map<string, RelayEdge[]>;
}
/**
 * Computes topological order of nodes using Kahn's algorithm.
 * Throws error if a cycle exists.
 */
export declare function buildExecutionPlan(graph: RelayGraph): ExecutionPlan;
//# sourceMappingURL=scheduler.d.ts.map