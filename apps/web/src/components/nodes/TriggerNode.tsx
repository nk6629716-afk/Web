import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NeumoNodeShell } from './NeumoNodeShell';
import { WorkflowNodeData } from '@relay/shared';

export const TriggerNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const config = nodeData.config || {};
  let preview = 'Simulated Webhook Payload';

  if (typeof config.payload === 'string') {
    preview = config.payload.substring(0, 40) + (config.payload.length > 40 ? '...' : '');
  } else if (config.payload && typeof config.payload === 'object') {
    const keys = Object.keys(config.payload);
    preview = `Payload: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`;
  }

  return (
    <div className="relative group">
      <NeumoNodeShell
        id={id}
        type="trigger"
        label={nodeData.label || 'Trigger'}
        subtitle="Execution Origin"
        status={nodeData.status}
        selected={selected}
      >
        <div className="font-mono text-[10px] text-[#00ff88] truncate">
          {preview}
        </div>
      </NeumoNodeShell>

      {/* Tactile Right Output Port */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-[#292b30] !border-2 !border-[#00ff88]/60 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] !-right-2"
      />
    </div>
  );
};
