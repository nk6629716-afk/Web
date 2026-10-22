import React from 'react';
import { Play, RotateCcw, CheckCircle, AlertTriangle, ShieldCheck, Trash2, Users } from 'lucide-react';
import { Collaborator } from '@relay/shared';

interface TopNavProps {
  workflowTitle: string;
  onTitleChange: (title: string) => void;
  revision: number;
  isDirty: boolean;
  isRunning: boolean;
  collaborators: Collaborator[];
  onRun: () => void;
  onResetSample: () => void;
  onValidate: () => void;
  onClear: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  workflowTitle,
  onTitleChange,
  revision,
  isDirty,
  isRunning,
  collaborators,
  onRun,
  onResetSample,
  onValidate,
  onClear,
}) => {
  return (
    <header className="h-14 border-b border-white/10 bg-[#0d121f]/95 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Brand & Workflow Title */}
      <div className="flex items-center gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <span className="font-black text-white text-base tracking-tighter">⚡</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-wide leading-tight">RELAY</span>
            <span className="text-[10px] text-blue-400 font-medium leading-none">Studio v1.0</span>
          </div>
        </div>

        {/* Workflow Title Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={workflowTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="bg-transparent hover:bg-white/5 focus:bg-white/10 px-2.5 py-1 rounded-md text-sm font-medium text-slate-100 border border-transparent focus:border-blue-500/50 outline-none transition-all w-64 truncate"
            title="Click to rename workflow"
          />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 border border-white/5 text-[11px] font-mono text-slate-400">
            <span>Rev</span>
            <span className="text-blue-400 font-semibold">#{revision}</span>
          </div>

          {/* Dirty/Saved Indicator */}
          {isDirty ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Unsaved changes</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              <span>Saved</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Presence & Actions */}
      <div className="flex items-center gap-2.5">
        {/* Collaborators */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-white/5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex -space-x-1.5 overflow-hidden">
            {collaborators.map((c) => (
              <div
                key={c.userId}
                title={`${c.displayName} (Active)`}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#0d121f] shadow"
                style={{ backgroundColor: c.color }}
              >
                {c.displayName.substring(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
          <span className="text-xs text-slate-400 font-medium pl-1">
            {collaborators.length} online
          </span>
        </div>

        {/* Validation Button */}
        <button
          onClick={onValidate}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm"
          title="Validate graph structure and cycle rules"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Validate</span>
        </button>

        {/* Reset Sample Button */}
        <button
          onClick={onResetSample}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm"
          title="Reload the seeded demo onboarding workflow"
        >
          <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
          <span>Reset Sample</span>
        </button>

        {/* Clear Button */}
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all shadow-sm"
          title="Clear canvas"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Primary Run Workflow Button */}
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-lg ${
            isRunning
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 hover:shadow-blue-500/40 scale-100 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Executing...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Workflow</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
