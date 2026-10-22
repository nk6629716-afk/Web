import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { RelayNodeData } from '@relay/shared';
import { BaseNode } from './BaseNode';
import { Send } from 'lucide-react';

export const OutputNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as RelayNodeData;
  const destination = nodeData.config?.destination || 'response';
  const label = nodeData.config?.label || 'Final Destination';

  return (
    <BaseNode
      title={nodeData.label || 'Output'}
      typeLabel="Output"
      typeColor="text-emerald-400 bg-emerald-950/40 border-emerald-500/30"
      icon={<Send className="w-3.5 h-3.5 text-emerald-400" />}
      status={nodeData.status}
      selected={selected}
      subtitle={`Dest: ${destination} (${label})`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-emerald-400 !border-slate-900 !w-3 !h-3"
      />

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>In: Final Result</span>
        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
          Terminal
        </span>
      </div>
    </BaseNode>
  );
};
