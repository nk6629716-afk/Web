import React, { useState } from 'react';
import { Execution } from '@relay/shared';
import { ChevronUp, ChevronDown, Terminal } from 'lucide-react';
import { StatusLED, LEDStatus } from './ui/StatusLED';
import { NeumoButton } from './ui/NeumoButton';

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

  const overallLED: LEDStatus = isRunning
    ? 'running'
    : execution?.status === 'succeeded'
    ? 'success'
    : execution?.status === 'failed'
    ? 'failed'
    : 'idle';

  return (
    <div
      className={`absolute bottom-0 left-64 right-80 bg-[#292b30] border-t border-white/[0.04] shadow-[0_-8px_20px_rgba(0,0,0,0.4)] transition-all duration-300 z-20 flex flex-col ${
        isOpen ? 'h-64' : 'h-11'
      }`}
    >
      {/* Console Bar Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-11 px-4 flex items-center justify-between border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.02] transition-colors select-none bg-[#292b30]"
      >
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-[#00bfff]" />
          <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
            EXECUTION TELEMETRY
          </span>

          <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#24262b] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] border border-white/[0.03]">
            <StatusLED status={overallLED} size="sm" />
            <span className="text-[10px] font-mono font-bold text-slate-300 uppercase">
              {isRunning
                ? 'RUNNING'
                : execution?.status === 'succeeded'
                ? 'SUCCESS'
                : execution?.status === 'failed'
                ? 'FAILED'
                : 'PENDING'}
            </span>
          </div>

          {execution && (
            <span className="text-[11px] font-mono text-slate-400">
              {succeededCount} PASSED · {skippedCount} SKIPPED {failedCount > 0 && `· ${failedCount} FAILED`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <NeumoButton
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            icon={isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {/* Steps List */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#25272c] shadow-[inset_3px_3px_8px_rgba(0,0,0,0.4)]">
          {steps.length === 0 && isRunning && (
            <div className="flex items-center justify-center h-full text-xs font-mono text-slate-400 gap-2">
              <StatusLED status="running" size="sm" />
              <span>Executing workflow steps...</span>
            </div>
          )}

          {steps.map((step, idx) => {
            const isExpanded = expandedStepId === step.id;
            const stepLED: LEDStatus =
              step.status === 'succeeded'
                ? 'success'
                : step.status === 'failed'
                ? 'failed'
                : step.status === 'running'
                ? 'running'
                : 'idle';

            return (
              <div
                key={step.id || idx}
                className="rounded-xl bg-[#292b30] border border-white/[0.03] shadow-[3px_3px_6px_rgba(0,0,0,0.35),-3px_-3px_6px_rgba(255,255,255,0.06)] overflow-hidden text-xs"
              >
                <div
                  onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                  className="px-3.5 py-2 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StatusLED status={stepLED} size="sm" />
                    <span className="font-mono text-slate-200 font-semibold">{step.nodeId}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold text-slate-400 bg-[#24262b] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]">
                      {step.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-[#00bfff]">{step.durationMs}ms</span>
                    <NeumoButton
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(step.nodeId);
                      }}
                    >
                      Inspect
                    </NeumoButton>
                    <span className="text-slate-500">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  </div>
                </div>

                {/* Expanded Payload */}
                {isExpanded && (
                  <div className="p-3 border-t border-white/[0.04] bg-[#222428] font-mono text-[11px] space-y-2 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]">
                    {step.errorMessage && (
                      <div className="text-[#ff3366] pb-1 font-semibold">Error: {step.errorMessage}</div>
                    )}
                    <div>
                      <div className="text-slate-500 text-[10px] mb-0.5 uppercase font-bold">Output:</div>
                      <pre className="text-[#00ff88] overflow-x-auto max-h-32">
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
