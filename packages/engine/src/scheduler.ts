import { RelayGraph, RelayNode, RelayEdge } from '@relay/shared';

export interface ExecutionPlan {
  orderedNodeIds: string[];
  incomingEdges: Map<string, RelayEdge[]>;
  outgoingEdges: Map<string, RelayEdge[]>;
}

/**
 * Computes topological order of nodes using Kahn's algorithm.
 * Throws error if a cycle exists.
 */
export function buildExecutionPlan(graph: RelayGraph): ExecutionPlan {
  const nodeMap = new Map<string, RelayNode>();
  const inDegree = new Map<string, number>();
  const incomingEdges = new Map<string, RelayEdge[]>();
  const outgoingEdges = new Map<string, RelayEdge[]>();

  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
    inDegree.set(node.id, 0);
    incomingEdges.set(node.id, []);
    outgoingEdges.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
      outgoingEdges.get(edge.source)!.push(edge);
      incomingEdges.get(edge.target)!.push(edge);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  // Queue of nodes with no incoming edges (triggers / root nodes)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const orderedNodeIds: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    orderedNodeIds.push(currentId);

    const edgesFromCurrent = outgoingEdges.get(currentId) || [];
    for (const edge of edgesFromCurrent) {
      const targetDegree = inDegree.get(edge.target)! - 1;
      inDegree.set(edge.target, targetDegree);
      if (targetDegree === 0) {
        queue.push(edge.target);
      }
    }
  }

  if (orderedNodeIds.length !== graph.nodes.length) {
    throw new Error('Cycle detected in graph; topological execution plan cannot be resolved.');
  }

  return {
    orderedNodeIds,
    incomingEdges,
    outgoingEdges
  };
}
