import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CustomNodeShell } from './CustomNodeShell';
import { WorkflowNodeData } from '@relay/shared';

export const TriggerNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const config = nodeData.config || {};
  let preview = 'Incoming payload trigger';

  if (typeof config.payload === 'string') {
    preview = config.payload.substring(0, 45) + (config.payload.length > 45 ? '...' : '');
  } else if (config.payload && typeof config.payload === 'object') {
    const keys = Object.keys(config.payload);
    preview = `Payload: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`;
  }

  return (
    <div className="relative group">
      <CustomNodeShell
        id={id}
        type="trigger"
        label={nodeData.label || 'Trigger'}
        subtitle="Starts flow"
        status={nodeData.status}
        selected={selected}
      >
        <div className="bg-slate-900/60 rounded p-1.5 font-mono text-[11px] text-slate-300 truncate border border-white/5">
          {preview}
        </div>
      </CustomNodeShell>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-slate-900 shadow-md !-right-1.5"
      />
    </div>
  );
};
