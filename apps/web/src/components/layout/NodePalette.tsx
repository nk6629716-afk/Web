import React from 'react';
import { NodeType } from '@relay/shared';
import { Zap, Cpu, GitBranch, Send, Plus, Info } from 'lucide-react';
import { StatusLED } from '../ui/StatusLED';

interface NodePaletteProps {
  onAddNode: (type: NodeType) => void;
}

interface PaletteModule {
  type: NodeType;
  title: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  ledMode: 'success' | 'cyan' | 'idle' | 'running';
}

const MODULES: PaletteModule[] = [
  {
    type: 'trigger',
    title: 'Trigger Module',
    category: 'ENTRY POINT',
    description: 'Manual or webhook execution origin with simulated JSON payload.',
    icon: Zap,
    accentColor: 'text-[#00ff88]',
    ledMode: 'success',
  },
  {
    type: 'transform',
    title: 'Transform Module',
    category: 'DATA PROCESSING',
    description: 'String trim, lowercase, uppercase, or template variable substitution.',
    icon: Cpu,
    accentColor: 'text-[#8b5cf6]',
    ledMode: 'cyan',
  },
  {
    type: 'condition',
    title: 'Condition Module',
    category: 'BRANCH LOGIC',
    description: 'Binary decision logic with dual True and False tactile routing ports.',
    icon: GitBranch,
    accentColor: 'text-[#ffaa00]',
    ledMode: 'idle',
  },
  {
    type: 'output',
    title: 'Output Terminal',
    category: 'DESTINATION',
    description: 'Final execution terminal displaying aggregated payload and alerts.',
    icon: Send,
    accentColor: 'text-[#00bfff]',
    ledMode: 'cyan',
  },
];

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-[#292b30] border-r border-white/[0.04] flex flex-col z-20 select-none shadow-[4px_0_12px_rgba(0,0,0,0.25)]">
      {/* Sidebar Header Plate */}
      <div className="p-4 border-b border-white/[0.04] bg-[#292b30]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
            MODULE LIBRARY
          </span>
          <StatusLED status="cyan" size="sm" />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Drag module or click to place on canvas
        </p>
      </div>

      {/* Modules List */}
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.type}
              draggable
              onDragStart={(e) => onDragStart(e, mod.type)}
              onClick={() => onAddNode(mod.type)}
              className="group p-3 rounded-xl bg-[#292b30] border border-white/[0.03] shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.08)] hover:shadow-[5px_5px_10px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.1)] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.08)] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all duration-150"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-lg bg-[#24262b] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] ${mod.accentColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                    {mod.title}
                  </span>
                </div>
                <button
                  type="button"
                  title="Click to insert"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-[#24262b] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)] text-slate-300 transition-opacity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <span className="block text-[9px] font-mono font-bold tracking-wider text-slate-500 mb-1">
                {mod.category}
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {mod.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer Instructions Plaque */}
      <div className="p-3 m-3 rounded-xl bg-[#25272c] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.05)] border border-white/[0.02] text-[10px] text-slate-400 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-[#00bfff] shrink-0 mt-0.5" />
        <span>
          Connect tactile ports to link modules. Select a node to configure parameters in the right panel.
        </span>
      </div>
    </aside>
  );
};
