import React from 'react';
import { NodeType } from '@relay/shared';
import { Zap, Cpu, GitBranch, Send, Plus, Info } from 'lucide-react';

interface NodePaletteProps {
  onAddNode: (type: NodeType) => void;
}

interface PaletteItem {
  type: NodeType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'trigger',
    title: 'Trigger',
    description: 'Entry point with payload or simulated webhook input.',
    icon: Zap,
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400',
    badgeBorder: 'border-emerald-500/30 hover:border-emerald-500/60',
  },
  {
    type: 'transform',
    title: 'Transform',
    description: 'String manipulation, lowercase, trim, or template resolution.',
    icon: Cpu,
    accentColor: 'text-violet-400',
    badgeBg: 'bg-violet-500/10 text-violet-400',
    badgeBorder: 'border-violet-500/30 hover:border-violet-500/60',
  },
  {
    type: 'condition',
    title: 'Condition',
    description: 'Binary decision node with True and False output branches.',
    icon: GitBranch,
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-400',
    badgeBorder: 'border-amber-500/30 hover:border-amber-500/60',
  },
  {
    type: 'output',
    title: 'Output',
    description: 'Final execution terminal displaying aggregated results.',
    icon: Send,
    accentColor: 'text-sky-400',
    badgeBg: 'bg-sky-500/10 text-sky-400',
    badgeBorder: 'border-sky-500/30 hover:border-sky-500/60',
  },
];

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 border-r border-white/10 bg-[#0d121f]/90 backdrop-blur-md flex flex-col z-20 select-none">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Node Library
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Drag to canvas or click to insert
        </p>
      </div>

      <div className="p-3 space-y-2.5 flex-1 overflow-y-auto">
        {PALETTE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              onClick={() => onAddNode(item.type)}
              className={`group p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/60 border ${item.badgeBorder} cursor-grab active:cursor-grabbing transition-all duration-150 shadow-sm hover:shadow-md hover:scale-[1.01]`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg bg-white/5 ${item.accentColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-100 group-hover:text-white">
                    {item.title}
                  </span>
                </div>
                <button
                  type="button"
                  title="Click to add"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer Info Tips */}
      <div className="p-3 border-t border-white/10 bg-black/20 text-[11px] text-slate-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <span>
          Connect condition handles to create branched workflows. Press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-white/10 text-[10px] text-slate-300">Backspace</kbd> to delete.
        </span>
      </div>
    </aside>
  );
};
