import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { RelayNodeData } from '@relay/shared';
import { BaseNode } from './BaseNode';
import { Zap } from 'lucide-react';

export const TriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as RelayNodeData;
  const triggerType = nodeData.config?.triggerType || 'webhook';

  return (
    <BaseNode
      title={nodeData.label || 'Trigger'}
      typeLabel="Trigger"
      typeColor="text-amber-400 bg-amber-950/40 border-amber-500/30"
      icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
      status={nodeData.status}
      selected={selected}
      subtitle={`Type: ${triggerType}`}
    >
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>Initial event source</span>
        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">Out</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-amber-400 !border-slate-900 !w-3 !h-3"
      />
    </BaseNode>
  );
};
