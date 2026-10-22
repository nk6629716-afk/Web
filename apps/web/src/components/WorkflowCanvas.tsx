import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  useReactFlow,
} from '@xyflow/react';
import { nodeTypes } from './nodes';
import { edgeTypes } from './nodes/CustomEdges';
import { NodeType, WorkflowNodeData } from '@relay/shared';

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onPaneClick: () => void;
  onDropNode: (type: NodeType, position: { x: number; y: number }) => void;
}

const WorkflowCanvasInner: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onDropNode,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onDropNode(type, position);
    },
    [screenToFlowPosition, onDropNode]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full relative bg-[#292b30]"
      style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.08) 1.5px, transparent 0)',
        backgroundSize: '24px 24px',
      }}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: 'neon',
          animated: false,
        }}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        minZoom={0.2}
        maxZoom={2}
      >
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => {
            const data = n.data as unknown as WorkflowNodeData;
            switch (data?.nodeType) {
              case 'trigger':
                return '#00ff88';
              case 'transform':
                return '#8b5cf6';
              case 'condition':
                return '#ffaa00';
              case 'output':
                return '#00bfff';
              default:
                return '#64748b';
            }
          }}
          maskColor="rgba(36, 38, 43, 0.85)"
          className="!m-4"
        />
      </ReactFlow>
    </div>
  );
};

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = (props) => {
  return <WorkflowCanvasInner {...props} />;
};
