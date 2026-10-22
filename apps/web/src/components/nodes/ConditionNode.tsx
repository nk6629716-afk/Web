import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { RelayNodeData } from '@relay/shared';
import { BaseNode } from './BaseNode';
import { GitFork } from 'lucide-react';

export const ConditionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as RelayNodeData;
  const operator = nodeData.config?.operator || 'equals';
  const fieldPath = nodeData.config?.fieldPath || 'key';
  const targetValue = nodeData.config?.targetValue ?? 'value';

  return (
    <BaseNode
      title={nodeData.label || 'Condition'}
      typeLabel="Condition"
      typeColor="text-violet-400 bg-violet-950/40 border-violet-500/30"
      icon={<GitFork className="w-3.5 h-3.5 text-violet-400" />}
      status={nodeData.status}
      selected={selected}
      subtitle={`${fieldPath} ${operator} "${targetValue}"`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-slate-400 !border-slate-900 !w-3 !h-3"
      />

      <div className="flex flex-col gap-2 relative py-1">
        <div className="flex items-center justify-end pr-4 text-[11px] font-semibold text-emerald-400">
          <span>True</span>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!bg-emerald-400 !border-slate-900 !w-3 !h-3 !top-[30%]"
          />
        </div>

        <div className="flex items-center justify-end pr-4 text-[11px] font-semibold text-rose-400">
          <span>False</span>
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!bg-rose-400 !border-slate-900 !w-3 !h-3 !top-[70%]"
          />
        </div>
      </div>
    </BaseNode>
  );
};
