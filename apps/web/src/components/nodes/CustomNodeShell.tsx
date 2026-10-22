import React from 'react';
import { NodeStatus, NodeType } from '@relay/shared';
import {
  Zap,
  Cpu,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Activity,
  Send,
} from 'lucide-react';

interface CustomNodeShellProps {
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
    borderActive: string;
    badgeBg: string;
    badgeText: string;
    label: string;
  }
> = {
  trigger: {
    icon: Zap,
    accentColor: 'text-emerald-400',
    borderActive: 'border-emerald-500/50',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    badgeText: 'TRIGGER',
    label: 'Trigger',
  },
  transform: {
    icon: Cpu,
    accentColor: 'text-violet-400',
    borderActive: 'border-violet-500/50',
    badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    badgeText: 'TRANSFORM',
    label: 'Transform',
  },
  condition: {
    icon: GitBranch,
    accentColor: 'text-amber-400',
    borderActive: 'border-amber-500/50',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    badgeText: 'CONDITION',
    label: 'Condition',
  },
  output: {
    icon: Send,
    accentColor: 'text-sky-400',
    borderActive: 'border-sky-500/50',
    badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    badgeText: 'OUTPUT',
    label: 'Output',
  },
};

const STATUS_CONFIG: Record<
  NodeStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    pulse?: boolean;
    text: string;
  }
> = {
  idle: {
    icon: Clock,
    color: 'text-slate-400',
    bg: 'bg-slate-800/60',
    text: 'Idle',
  },
  pending: {
    icon: Clock,
    color: 'text-slate-300',
    bg: 'bg-slate-700/60',
    text: 'Pending',
  },
  running: {
    icon: Activity,
    color: 'text-sky-400',
    bg: 'bg-sky-500/20 border-sky-400/40',
    pulse: true,
    text: 'Running',
  },
  succeeded: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20 border-emerald-400/30',
    text: 'Success',
  },
  failed: {
    icon: AlertCircle,
    color: 'text-rose-400',
    bg: 'bg-rose-500/20 border-rose-400/40',
    text: 'Failed',
  },
  skipped: {
    icon: Ban,
    color: 'text-slate-500',
    bg: 'bg-slate-800/40',
    text: 'Skipped',
  },
};

export const CustomNodeShell: React.FC<CustomNodeShellProps> = ({
  type,
  label,
  subtitle,
  status = 'idle',
  selected,
  children,
}) => {
  const typeCfg = TYPE_CONFIG[type];
  const Icon = typeCfg.icon;
  const statusCfg = STATUS_CONFIG[status];
  const StatusIcon = statusCfg.icon;

  const isSkipped = status === 'skipped';
  const isRunning = status === 'running';

  return (
    <div
      className={`relative min-w-[240px] max-w-[280px] rounded-xl bg-[#0f1523]/95 backdrop-blur-md border transition-all duration-200 shadow-xl ${
        selected
          ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.35)] scale-[1.01]'
          : isRunning
          ? 'border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.45)]'
          : status === 'failed'
          ? 'border-rose-500/70 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
          : status === 'succeeded'
          ? 'border-emerald-500/50'
          : 'border-white/10 hover:border-white/20'
      } ${isSkipped ? 'opacity-40 grayscale-[0.5]' : ''}`}
    >
      {/* Top Accent Gradient Bar */}
      <div
        className={`h-1 w-full rounded-t-xl ${
          type === 'trigger'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
            : type === 'transform'
            ? 'bg-gradient-to-r from-violet-500 to-indigo-400'
            : type === 'condition'
            ? 'bg-gradient-to-r from-amber-500 to-orange-400'
            : 'bg-gradient-to-r from-sky-500 to-cyan-400'
        }`}
      />

      {/* Header */}
      <div className="p-3.5 pb-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`p-1.5 rounded-lg bg-white/5 border border-white/10 ${typeCfg.accentColor}`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span
              className={`text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded border uppercase ${typeCfg.badgeBg}`}
            >
              {typeCfg.badgeText}
            </span>
          </div>

          {/* Status Badge */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
              statusCfg.bg
            } ${statusCfg.color} ${statusCfg.pulse ? 'animate-pulse' : ''}`}
          >
            <StatusIcon className="w-3 h-3" />
            <span>{statusCfg.text}</span>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-sm font-semibold text-slate-100 truncate">{label}</h4>
        {subtitle && (
          <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">{subtitle}</p>
        )}
      </div>

      {/* Custom Body / Content */}
      {children && (
        <div className="px-3.5 pb-3 pt-1 border-t border-white/5 text-xs text-slate-300">
          {children}
        </div>
      )}
    </div>
  );
};
