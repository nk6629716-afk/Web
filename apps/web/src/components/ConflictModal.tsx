import React from 'react';
import { AlertCircle, RefreshCw, Upload } from 'lucide-react';
import { Workflow } from '@relay/shared';

interface ConflictModalProps {
  isOpen: boolean;
  serverWorkflow: Workflow | null;
  localRevision: number;
  onAcceptServer: () => void;
  onForceOverwrite: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  serverWorkflow,
  localRevision,
  onAcceptServer,
  onForceOverwrite
}) => {
  if (!isOpen || !serverWorkflow) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl p-6 text-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Revision Conflict Detected
            </h3>
            <p className="text-xs text-slate-400">
              Another collaborator updated this workflow.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-slate-400">Your local revision:</span>
            <span className="font-mono text-amber-400 font-semibold">v{localRevision}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Latest server revision:</span>
            <span className="font-mono text-sky-400 font-semibold">v{serverWorkflow.revision}</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            To prevent silent overwrites, choose whether to pull their canonical changes or force your local edits.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onForceOverwrite}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Force My Version
          </button>
          <button
            onClick={onAcceptServer}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Accept Server Changes
          </button>
        </div>
      </div>
    </div>
  );
};
