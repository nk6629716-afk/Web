import React from 'react';
import { Play, RotateCcw, ShieldCheck, Trash2, Users } from 'lucide-react';
import { Collaborator } from '@relay/shared';
import { NeumoButton } from '../ui/NeumoButton';
import { StatusLED } from '../ui/StatusLED';

interface HeaderProps {
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

export const Header: React.FC<HeaderProps> = ({
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
    <header className="h-16 bg-[#292b30] shadow-[0_4px_12px_rgba(0,0,0,0.35)] border-b border-white/[0.04] px-5 flex items-center justify-between z-30 select-none">
      {/* Left: Brand & Workflow Title */}
      <div className="flex items-center gap-4">
        {/* Brand Plaque */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#292b30] shadow-[3px_3px_6px_rgba(0,0,0,0.4),-3px_-3px_6px_rgba(255,255,255,0.08)] border border-white/[0.03]">
          <StatusLED status="cyan" size="sm" />
          <span className="font-black text-sm tracking-widest text-slate-100 uppercase">
            RELAY
          </span>
          <span className="text-[10px] font-mono font-bold text-[#00bfff] bg-[#222428] px-1.5 py-0.5 rounded shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
            v1.0
          </span>
        </div>

        {/* Workflow Title Input (Recessed Well) */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={workflowTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="bg-[#24262b] text-slate-100 font-medium px-3 py-1.5 rounded-lg text-xs w-60 border border-white/[0.03] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.06)] focus:border-[#00bfff]/50 outline-none transition-all"
            title="Click to rename workflow"
          />

          {/* Revision Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#24262b] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)] border border-white/[0.03] text-[11px] font-mono text-slate-400">
            <span>REV</span>
            <span className="text-[#00bfff] font-bold">#{revision}</span>
          </div>

          {/* Status Indicator with LED */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#24262b] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)] border border-white/[0.03]">
            <StatusLED status={isDirty ? 'idle' : 'success'} size="sm" />
            <span className="text-[11px] font-mono text-slate-300">
              {isDirty ? 'UNSAVED' : 'SAVED'}
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Collaborators Well */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#24262b] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.06)] border border-white/[0.03]">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex -space-x-1.5 overflow-hidden">
            {collaborators.map((c) => (
              <div
                key={c.userId}
                title={`${c.displayName} (Active)`}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-md border border-[#292b30]"
                style={{ backgroundColor: c.color }}
              >
                {c.displayName.substring(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
          <span className="text-[11px] font-mono text-slate-400 pl-1">
            {collaborators.length}
          </span>
        </div>

        {/* Validation Button */}
        <NeumoButton
          onClick={onValidate}
          size="sm"
          icon={<ShieldCheck className="w-3.5 h-3.5 text-[#00ff88]" />}
          title="Validate workflow graph integrity"
        >
          Validate
        </NeumoButton>

        {/* Reset Sample Button */}
        <NeumoButton
          onClick={onResetSample}
          size="sm"
          icon={<RotateCcw className="w-3.5 h-3.5 text-[#00bfff]" />}
          title="Reload demo onboarding workflow"
        >
          Reset Sample
        </NeumoButton>

        {/* Clear Button */}
        <NeumoButton
          onClick={onClear}
          size="sm"
          variant="danger"
          icon={<Trash2 className="w-3.5 h-3.5 text-[#ff3366]" />}
          title="Clear canvas"
        />

        {/* Primary RUN Button */}
        <NeumoButton
          onClick={onRun}
          disabled={isRunning}
          active={isRunning}
          variant="primary"
          size="md"
          className="font-bold tracking-wide shadow-[5px_5px_10px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.08)]"
          icon={
            isRunning ? (
              <div className="w-3.5 h-3.5 border-2 border-[#00bfff]/30 border-t-[#00bfff] rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-[#00bfff] text-[#00bfff]" />
            )
          }
        >
          {isRunning ? 'EXECUTING...' : 'RUN WORKFLOW'}
        </NeumoButton>
      </div>
    </header>
  );
};
