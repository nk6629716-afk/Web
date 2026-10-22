import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CustomNodeShell } from './CustomNodeShell';
import { WorkflowNodeData } from '@relay/shared';

export const OutputNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const config = nodeData.config || {};
  const title = config.title || 'Terminal Result';

  return (
    <div className="relative group">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-slate-900 shadow-md !-left-1.5"
      />

      <CustomNodeShell
        id={id}
        type="output"
        label={nodeData.label || 'Output'}
        subtitle="Final Destination"
        status={nodeData.status}
        selected={selected}
      >
        <div className="bg-slate-900/60 rounded px-2 py-1 font-mono text-[11px] text-sky-200 truncate border border-white/5">
          {title}
        </div>
      </CustomNodeShell>
    </div>
  );
};
