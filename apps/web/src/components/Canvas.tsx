import React, { useMemo, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  NodeChange, 
  EdgeChange, 
  Connection,
  Node,
  Edge
} from '@xyflow/react';
import { NodeType, RelayNode, RelayEdge } from '@relay/shared';
import { TriggerNode } from './nodes/TriggerNode';
import { TransformNode } from './nodes/TransformNode';
import { ConditionNode } from './nodes/ConditionNode';
import { OutputNode } from './nodes/OutputNode';

interface CanvasProps {
  nodes: RelayNode[];
  edges: RelayEdge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (nodeId: string) => void;
  onPaneClick: () => void;
  onDropNode: (type: NodeType, position: { x: number; y: number }) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onDropNode
}) => {
  const nodeTypes = useMemo(() => ({
    trigger: TriggerNode,
    transform: TransformNode,
    condition: ConditionNode,
    output: OutputNode
  }), []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow/type') as NodeType;
    if (!type) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const position = {
      x: event.clientX - bounds.left - 100,
      y: event.clientY - bounds.top - 50
    };

    onDropNode(type, position);
  }, [onDropNode]);

  return (
    <div 
      className="flex-1 h-full w-full relative bg-slate-950 select-none overflow-hidden"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes as unknown as Node[]}
        edges={edges as unknown as Edge[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange as any}
        onEdgesChange={onEdgesChange as any}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: '#475569', strokeWidth: 2 }
        }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger': return '#f59e0b';
              case 'transform': return '#0284c7';
              case 'condition': return '#8b5cf6';
              case 'output': return '#10b981';
              default: return '#64748b';
            }
          }}
          maskColor="rgba(9, 13, 22, 0.75)"
          className="!bg-slate-900 !border-slate-800 !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
};
