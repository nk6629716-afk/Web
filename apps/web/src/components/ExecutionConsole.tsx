import React, { useState } from 'react';
import { ExecutionStep } from '@relay/shared';
import { Terminal, ChevronUp, ChevronDown, CheckCircle2, XCircle, Clock, MinusCircle, Play } from 'lucide-react';
import clsx from 'clsx';

interface ExecutionConsoleProps {
  steps: ExecutionStep[];
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  durationMs?: number;
  error?: string;
  onClear: () => void;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({
  steps,
  status,
  durationMs,
  error,
  onClear
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (status === 'idle' && steps.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-800 bg-slate-950/95 backdrop-blur-md flex flex-col z-10 transition-all select-none">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2 flex items-center justify-between border-b border-slate-800/80 cursor-pointer hover:bg-slate-900/50"
      >
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold text-slate-200">
            Execution Console
          </span>

          <span
            className={clsx(
              'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1',
              status === 'running' && 'bg-sky-950 text-sky-400 border border-sky-800 animate-pulse',
              status === 'succeeded' && 'bg-emerald-950 text-emerald-400 border border-emerald-800',
              status === 'failed' && 'bg-rose-950 text-rose-400 border border-rose-800'
            )}
          >
            {status}
          </span>

          {durationMs !== undefined && durationMs > 0 && (
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {durationMs}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded hover:bg-slate-800 transition"
          >
            Clear
          </button>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded Step Log */}
      {isExpanded && (
        <div className="max-h-48 overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
          {error && (
            <div className="p-2 rounded bg-rose-950/50 border border-rose-900 text-rose-300 text-[11px]">
              🚨 Workflow Failed: {error}
            </div>
          )}

          {steps.map((step, idx) => (
            <div
              key={step.id || idx}
              className="flex items-center justify-between py-1 px-2.5 rounded bg-slate-900/60 border border-slate-800/60"
            >
              <div className="flex items-center gap-2">
                {step.status === 'succeeded' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {step.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                {step.status === 'running' && <Play className="w-3.5 h-3.5 text-sky-400 animate-spin" />}
                {step.status === 'skipped' && <MinusCircle className="w-3.5 h-3.5 text-slate-500" />}

                <span className="text-slate-300 font-semibold">{step.nodeId}</span>

                <span className="text-[10px] uppercase text-slate-500 font-medium">
                  {step.status}
                </span>

                {step.errorMessage && (
                  <span className="text-rose-400 text-[10px] truncate max-w-sm">
                    ({step.errorMessage})
                  </span>
                )}
              </div>

              {step.durationMs !== undefined && (
                <span className="text-[10px] text-slate-500">
                  {step.durationMs}ms
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
