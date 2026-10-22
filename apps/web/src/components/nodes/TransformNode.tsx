import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CustomNodeShell } from './CustomNodeShell';
import { WorkflowNodeData } from '@relay/shared';

export const TransformNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const config = nodeData.config || {};
  const operation = config.operation || 'trim';
  const field = config.field || 'all fields';

  return (
    <div className="relative group">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 shadow-md !-left-1.5"
      />

      <CustomNodeShell
        id={id}
        type="transform"
        label={nodeData.label || 'Transform'}
        subtitle={`op: ${operation}`}
        status={nodeData.status}
        selected={selected}
      >
        <div className="flex items-center justify-between bg-slate-900/60 rounded px-2 py-1 font-mono text-[11px] border border-white/5">
          <span className="text-violet-300 font-semibold">{operation}</span>
          <span className="text-slate-400 truncate max-w-[120px]">{field}</span>
        </div>
      </CustomNodeShell>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-slate-900 shadow-md !-right-1.5"
      />
    </div>
  );
};
