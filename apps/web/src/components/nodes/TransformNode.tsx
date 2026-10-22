import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { RelayNodeData } from '@relay/shared';
import { BaseNode } from './BaseNode';
import { Cpu } from 'lucide-react';

export const TransformNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as RelayNodeData;
  const operation = nodeData.config?.operation || 'trim';
  const fieldPath = nodeData.config?.fieldPath;

  return (
    <BaseNode
      title={nodeData.label || 'Transform'}
      typeLabel="Transform"
      typeColor="text-sky-400 bg-sky-950/40 border-sky-500/30"
      icon={<Cpu className="w-3.5 h-3.5 text-sky-400" />}
      status={nodeData.status}
      selected={selected}
      subtitle={`Op: ${operation}${fieldPath ? ` on "${fieldPath}"` : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-slate-400 !border-slate-900 !w-3 !h-3"
      />

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>In: Payload</span>
        <span>Out: Result</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-sky-400 !border-slate-900 !w-3 !h-3"
      />
    </BaseNode>
  );
};
