import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CustomNodeShell } from './CustomNodeShell';
import { WorkflowNodeData } from '@relay/shared';

export const ConditionNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const config = nodeData.config || {};
  const field = config.field || 'field';
  const op = config.operator || 'equals';
  const val = config.value !== undefined ? String(config.value) : '""';

  return (
    <div className="relative group">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 shadow-md !-left-1.5"
      />

      <CustomNodeShell
        id={id}
        type="condition"
        label={nodeData.label || 'Condition'}
        subtitle="Binary Branch"
        status={nodeData.status}
        selected={selected}
      >
        <div className="space-y-1.5">
          <div className="bg-slate-900/60 rounded px-2 py-1 font-mono text-[11px] text-amber-200/90 truncate border border-white/5">
            {field} <span className="text-slate-400">{op}</span> "{val}"
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-semibold">
            <span>Branch:</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">True ↗</span>
              <span className="text-rose-400">False ↘</span>
            </div>
          </div>
        </div>
      </CustomNodeShell>

      {/* True Branch Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '38%' }}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-slate-900 shadow-md !-right-1.5"
      />

      {/* False Branch Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '72%' }}
        className="!w-3 !h-3 !bg-rose-400 !border-2 !border-slate-900 shadow-md !-right-1.5"
      />
    </div>
  );
};
