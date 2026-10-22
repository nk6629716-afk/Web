import React from 'react';
import { Collaborator } from '@relay/shared';
import { Play, Loader2, Check, Cloud, Users, Workflow as WorkflowIcon } from 'lucide-react';
import clsx from 'clsx';

interface TopNavProps {
  workflowName: string;
  revision: number;
  collaborators: Collaborator[];
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  isRunning: boolean;
  isConnected: boolean;
  onRunWorkflow: () => void;
  onSaveWorkflow: () => void;
  onNameChange?: (name: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  workflowName,
  revision,
  collaborators,
  isSaving,
  hasUnsavedChanges,
  isRunning,
  isConnected,
  onRunWorkflow,
  onSaveWorkflow,
  onNameChange
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between z-20 select-none">
      {/* Brand & Workflow Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <WorkflowIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            RELAY
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-800 mx-1" />

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => onNameChange?.(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-200 hover:bg-slate-900 focus:bg-slate-900 px-2 py-1 rounded transition-colors border border-transparent focus:border-slate-700 outline-none max-w-[260px] truncate"
            title="Click to rename workflow"
          />

          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            v{revision}
          </span>

          <span className="text-[10px] uppercase font-semibold tracking-wider text-sky-400 bg-sky-950/70 border border-sky-800/60 px-2 py-0.5 rounded-full">
            Demo Studio
          </span>
        </div>
      </div>

      {/* Right Controls: Save, Presence, Run */}
      <div className="flex items-center gap-3">
        {/* Connection & Save Status */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'
              )}
            />
            <span className="text-[11px] text-slate-400">
              {isConnected ? 'Realtime Connected' : 'Disconnected'}
            </span>
          </div>

          <div
            onClick={onSaveWorkflow}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850 transition-colors"
            title="Click to manually save"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />
                <span className="text-[11px] text-sky-400">Saving...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[11px] text-amber-400">Unsaved Changes</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] text-slate-300">Saved</span>
              </>
            )}
          </div>
        </div>

        {/* Collaborators Presence Avatars */}
        {collaborators.length > 0 && (
          <div className="flex items-center -space-x-1.5 px-2 py-1 rounded-md bg-slate-900/60 border border-slate-800">
            <Users className="w-3 h-3 text-slate-500 mr-2" />
            {collaborators.map((c, i) => {
              const cId = c.id || c.userId || `c-${i}`;
              const cName = c.name || c.displayName || 'Peer';
              return (
                <div
                  key={cId}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-950 border-2 border-slate-950 shadow"
                  style={{ backgroundColor: c.color }}
                  title={`${cName} (${cId.substring(0, 5)})`}
                >
                  {cName.substring(0, 2).toUpperCase()}
                </div>
              );
            })}
          </div>
        )}

        {/* Run Workflow CTA */}
        <button
          onClick={onRunWorkflow}
          disabled={isRunning}
          className={clsx(
            'flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-all',
            isRunning
              ? 'bg-sky-600 text-white cursor-wait opacity-90 shadow-sky-600/30'
              : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-emerald-600/30'
          )}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
