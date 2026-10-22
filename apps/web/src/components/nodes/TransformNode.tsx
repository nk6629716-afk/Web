import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NeumoNodeShell } from './NeumoNodeShell';
import { WorkflowNodeData } from '@relay/shared';

export const TransformNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const config = nodeData.config || {};
  const operation = config.operation || 'trim';
  const field = config.field || 'all fields';

  return (
    <div className="relative group">
      {/* Left Input Port */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3.5 !h-3.5 !bg-[#292b30] !border-2 !border-slate-500 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] !-left-2"
      />

      <NeumoNodeShell
        id={id}
        type="transform"
        label={nodeData.label || 'Transform'}
        subtitle={`op: ${operation}`}
        status={nodeData.status}
        selected={selected}
      >
        <div className="flex items-center justify-between font-mono text-[10px]">
          <span className="text-[#8b5cf6] font-bold uppercase">{operation}</span>
          <span className="text-slate-400 truncate max-w-[120px]">{field}</span>
        </div>
      </NeumoNodeShell>

      {/* Right Output Port */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-[#292b30] !border-2 !border-[#8b5cf6]/60 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] !-right-2"
      />
    </div>
  );
};
