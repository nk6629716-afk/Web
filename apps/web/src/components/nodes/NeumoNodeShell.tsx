import React from 'react';
import { NodeStatus, NodeType } from '@relay/shared';
import { StatusLED, LEDStatus } from '../ui/StatusLED';
import { Zap, Cpu, GitBranch, Send } from 'lucide-react';

interface NeumoNodeShellProps {
  id: string;
  type: NodeType;
  label: string;
  subtitle?: string;
  status?: NodeStatus;
  selected?: boolean;
  children?: React.ReactNode;
}

const TYPE_CONFIG: Record<
  NodeType,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    label: string;
  }
> = {
  trigger: {
    icon: Zap,
    accentColor: 'text-[#00ff88]',
    label: 'TRIGGER',
  },
  transform: {
    icon: Cpu,
    accentColor: 'text-[#8b5cf6]',
    label: 'TRANSFORM',
  },
  condition: {
    icon: GitBranch,
    accentColor: 'text-[#ffaa00]',
    label: 'CONDITION',
  },
  output: {
    icon: Send,
    accentColor: 'text-[#00bfff]',
    label: 'OUTPUT',
  },
};

export const NeumoNodeShell: React.FC<NeumoNodeShellProps> = ({
  type,
  label,
  subtitle,
  status = 'idle',
  selected,
  children,
}) => {
  const typeCfg = TYPE_CONFIG[type];
  const Icon = typeCfg.icon;

  const ledStatus: LEDStatus =
    status === 'succeeded'
      ? 'success'
      : status === 'running'
      ? 'running'
      : status === 'failed'
      ? 'failed'
      : 'idle';

  const isRunning = status === 'running';
  const isSkipped = status === 'skipped';

  return (
    <div
      className={`relative min-w-[250px] max-w-[290px] rounded-2xl bg-[#292b30] border border-white/[0.04] transition-all duration-200 select-none ${
        selected
          ? 'shadow-[6px_6px_14px_rgba(0,0,0,0.5),-6px_-6px_14px_rgba(255,255,255,0.1),0_0_16px_rgba(0,191,255,0.45)] border-[#00bfff]/50'
          : isRunning
          ? 'shadow-[6px_6px_14px_rgba(0,0,0,0.5),-6px_-6px_14px_rgba(255,255,255,0.1),0_0_16px_rgba(0,255,136,0.4)] border-[#00ff88]/40'
          : 'shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.08)] hover:shadow-[7px_7px_14px_rgba(0,0,0,0.45),-7px_-7px_14px_rgba(255,255,255,0.1)]'
      } ${isSkipped ? 'opacity-40 grayscale-[0.5]' : ''}`}
    >
      {/* Top Header Plate */}
      <div className="p-3.5 pb-2.5">
        <div className="flex items-center justify-between mb-2">
          {/* Node Type Pill */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-[#24262b] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] ${typeCfg.accentColor}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300 uppercase">
              {typeCfg.label}
            </span>
          </div>

          {/* Tactile Status LED */}
          <div className="px-2 py-1 rounded-full bg-[#24262b] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
            <StatusLED status={ledStatus} size="sm" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <h4 className="text-xs font-semibold text-slate-100 truncate tracking-wide">
          {label}
        </h4>
        {subtitle && (
          <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
            {subtitle}
          </p>
        )}
      </div>

      {/* Recessed Custom Payload Well */}
      {children && (
        <div className="px-3.5 pb-3 pt-1">
          <div className="p-2 rounded-xl bg-[#24262b] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.05)] border border-white/[0.02]">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
