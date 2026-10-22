import React, { useState } from 'react';
import { Execution, ExecutionStepResult } from '@relay/shared';
import {
  ChevronUp,
  ChevronDown,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Activity,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface ExecutionConsoleProps {
  execution: Execution | null;
  isRunning: boolean;
  onSelectNode: (nodeId: string) => void;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({
  execution,
  isRunning,
  onSelectNode,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  if (!execution && !isRunning) {
    return null;
  }

  const steps = execution?.steps || [];
  const succeededCount = steps.filter((s) => s.status === 'succeeded').length;
  const failedCount = steps.filter((s) => s.status === 'failed').length;
  const skippedCount = steps.filter((s) => s.status === 'skipped').length;

  return (
    <div
      className={`absolute bottom-0 left-64 right-80 bg-[#0d121f]/95 backdrop-blur-md border-t border-white/10 shadow-2xl transition-all duration-300 z-20 flex flex-col ${
        isOpen ? 'h-64' : 'h-10'
      }`}
    >
      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-4 flex items-center justify-between border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-slate-200">Execution Console</span>

          {isRunning ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-400/20 text-[11px] text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>Running...</span>
            </div>
          ) : execution?.status === 'succeeded' ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Execution Succeeded</span>
            </div>
          ) : execution?.status === 'failed' ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 font-medium">
              <AlertCircle className="w-3 h-3" />
              <span>Execution Failed</span>
            </div>
          ) : null}

          {execution && (
            <span className="text-[11px] font-mono text-slate-400">
              {succeededCount} passed · {skippedCount} skipped {failedCount > 0 && `· ${failedCount} failed`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <button
            type="button"
            className="p-1 hover:text-white"
            title={isOpen ? 'Collapse console' : 'Expand console'}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Steps List */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {steps.length === 0 && isRunning && (
            <div className="flex items-center justify-center h-full text-xs text-slate-400 gap-2">
              <Activity className="w-4 h-4 animate-spin text-sky-400" />
              <span>Starting execution workflow...</span>
            </div>
          )}

          {steps.map((step, idx) => {
            const isExpanded = expandedStepId === step.id;
            return (
              <div
                key={step.id || idx}
                className="rounded-lg bg-slate-900/60 border border-white/5 overflow-hidden text-xs"
              >
                <div
                  onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                  className="px-3 py-2 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {step.status === 'succeeded' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : step.status === 'failed' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    ) : step.status === 'running' ? (
                      <Activity className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                    ) : step.status === 'skipped' ? (
                      <Ban className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                    )}

                    <span className="font-mono text-slate-300 font-semibold">{step.nodeId}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold text-slate-400 bg-white/5">
                      {step.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-slate-400">{step.durationMs}ms</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(step.nodeId);
                      }}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-blue-400 font-medium"
                    >
                      Inspect
                    </button>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Payload */}
                {isExpanded && (
                  <div className="p-3 border-t border-white/5 bg-slate-950 font-mono text-[11px] space-y-2">
                    {step.errorMessage && (
                      <div className="text-rose-400 pb-1">Error: {step.errorMessage}</div>
                    )}
                    <div>
                      <div className="text-slate-500 text-[10px] mb-0.5 uppercase font-bold">Output:</div>
                      <pre className="text-emerald-300 overflow-x-auto max-h-32">
                        {JSON.stringify(step.output || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
