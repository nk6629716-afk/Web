import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NeumoNodeShell } from './NeumoNodeShell';
import { WorkflowNodeData } from '@relay/shared';

export const OutputNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const config = nodeData.config || {};
  const title = config.title || 'Terminal Result';

  return (
    <div className="relative group">
      {/* Left Input Port */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3.5 !h-3.5 !bg-[#292b30] !border-2 !border-[#00bfff] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] !-left-2"
      />

      <NeumoNodeShell
        id={id}
        type="output"
        label={nodeData.label || 'Output'}
        subtitle="Execution Terminal"
        status={nodeData.status}
        selected={selected}
      >
        <div className="font-mono text-[10px] text-[#00bfff] truncate">
          {title}
        </div>
      </NeumoNodeShell>
    </div>
  );
};
