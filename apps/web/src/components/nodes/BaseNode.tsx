import React, { ReactNode } from 'react';
import { NodeStatus } from '@relay/shared';
import { CheckCircle2, XCircle, Clock, PlayCircle, MinusCircle } from 'lucide-react';
import clsx from 'clsx';

interface BaseNodeProps {
  title: string;
  typeLabel: string;
  typeColor: string;
  icon: ReactNode;
  status?: NodeStatus;
  selected?: boolean;
  children?: ReactNode;
  subtitle?: string;
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  title,
  typeLabel,
  typeColor,
  icon,
  status = 'idle',
  selected = false,
  children,
  subtitle
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-500/40 animate-pulse">
            <PlayCircle className="w-3 h-3 animate-spin" />
            Running
          </span>
        );
      case 'succeeded':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" />
            Success
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-500/40">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'skipped':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700">
            <MinusCircle className="w-3 h-3" />
            Skipped
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={clsx(
        'w-64 rounded-xl border bg-slate-900/95 backdrop-blur-md shadow-xl transition-all duration-200 overflow-hidden',
        selected ? 'border-sky-400 ring-2 ring-sky-500/20 shadow-sky-500/10' : 'border-slate-800 hover:border-slate-700',
        status === 'running' && 'node-running',
        status === 'succeeded' && 'node-succeeded',
        status === 'failed' && 'node-failed',
        status === 'skipped' && 'node-skipped'
      )}
    >
      {/* Node Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/60 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className={clsx('p-1.5 rounded-lg border', typeColor)}>
            {icon}
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
              {typeLabel}
            </span>
            <h4 className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
              {title}
            </h4>
          </div>
        </div>

        <div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Node Body */}
      {subtitle && (
        <div className="px-3.5 py-2 text-[11px] text-slate-400 border-b border-slate-800/40 bg-slate-950/20 font-mono truncate">
          {subtitle}
        </div>
      )}

      {children && (
        <div className="p-3 text-xs text-slate-300">
          {children}
        </div>
      )}
    </div>
  );
};
