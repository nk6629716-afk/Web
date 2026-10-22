import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NeumoNodeShell } from './NeumoNodeShell';
import { WorkflowNodeData } from '@relay/shared';

export const ConditionNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const config = nodeData.config || {};
  const field = config.field || 'field';
  const op = config.operator || 'equals';
  const val = config.value !== undefined ? String(config.value) : '""';

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
        type="condition"
        label={nodeData.label || 'Condition'}
        subtitle="Binary Decision Logic"
        status={nodeData.status}
        selected={selected}
      >
        <div className="space-y-1.5 font-mono text-[10px]">
          <div className="text-[#ffaa00] truncate">
            {field} <span className="text-slate-400">{op}</span> "{val}"
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider pt-0.5">
            <span className="text-[#00ff88]">True ↗</span>
            <span className="text-[#ff3366]">False ↘</span>
          </div>
        </div>
      </NeumoNodeShell>

      {/* True Output Port */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '38%' }}
        className="!w-3.5 !h-3.5 !bg-[#292b30] !border-2 !border-[#00ff88] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] !-right-2"
      />

      {/* False Output Port */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '72%' }}
        className="!w-3.5 !h-3.5 !bg-[#292b30] !border-2 !border-[#ff3366] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] !-right-2"
      />
    </div>
  );
};
