import React from 'react';
import { NodeType } from '@relay/shared';
import { Zap, Cpu, GitFork, Send, Plus } from 'lucide-react';

interface NodePaletteProps {
  onAddNode: (type: NodeType) => void;
}

const PALETTE_ITEMS: Array<{
  type: NodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
}> = [
  {
    type: 'trigger',
    label: 'Trigger',
    description: 'Entry event payload',
    icon: <Zap className="w-4 h-4 text-amber-400" />,
    colorClass: 'border-amber-500/30 hover:border-amber-500/60 bg-amber-950/20'
  },
  {
    type: 'transform',
    label: 'Transform',
    description: 'Safe data modifier',
    icon: <Cpu className="w-4 h-4 text-sky-400" />,
    colorClass: 'border-sky-500/30 hover:border-sky-500/60 bg-sky-950/20'
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'True / False branch router',
    icon: <GitFork className="w-4 h-4 text-violet-400" />,
    colorClass: 'border-violet-500/30 hover:border-violet-500/60 bg-violet-950/20'
  },
  {
    type: 'output',
    label: 'Output',
    description: 'Terminal destination',
    icon: <Send className="w-4 h-4 text-emerald-400" />,
    colorClass: 'border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/20'
  }
];

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-60 border-r border-slate-800 bg-slate-950/90 backdrop-blur-md p-3.5 flex flex-col gap-4 select-none z-10">
      <div>
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
          Node Palette
        </h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Drag onto canvas or click (+) to insert a node.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            onClick={() => onAddNode(item.type)}
            className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing hover:shadow-md ${item.colorClass}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800">
                {item.icon}
              </div>
              <div>
                <h4 className="text-xs font-medium text-slate-200 group-hover:text-white">
                  {item.label}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {item.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="p-1 rounded bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              title={`Add ${item.label}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-auto p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-normal">
        <span className="font-semibold text-slate-300 block mb-1">💡 Realtime Sync</span>
        Edits are saved with revision checks and broadcast to all connected peer tabs.
      </div>
    </aside>
  );
};
