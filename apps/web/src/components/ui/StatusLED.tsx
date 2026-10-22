import React from 'react';

export type LEDStatus = 'idle' | 'running' | 'success' | 'failed' | 'cyan';

interface StatusLEDProps {
  status: LEDStatus;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LED_STYLES: Record<
  LEDStatus,
  {
    bg: string;
    glow: string;
    pulse?: boolean;
    text: string;
  }
> = {
  idle: {
    bg: 'bg-[#ffaa00]',
    glow: 'shadow-[0_0_8px_rgba(255,170,0,0.7)]',
    text: 'Idle',
  },
  running: {
    bg: 'bg-[#00ff88]',
    glow: 'shadow-[0_0_12px_rgba(0,255,136,0.9)]',
    pulse: true,
    text: 'Running',
  },
  success: {
    bg: 'bg-[#00ff88]',
    glow: 'shadow-[0_0_10px_rgba(0,255,136,0.8)]',
    text: 'Success',
  },
  failed: {
    bg: 'bg-[#ff3366]',
    glow: 'shadow-[0_0_10px_rgba(255,51,102,0.8)]',
    text: 'Error',
  },
  cyan: {
    bg: 'bg-[#00bfff]',
    glow: 'shadow-[0_0_12px_rgba(0,191,255,0.9)]',
    text: 'Active',
  },
};

export const StatusLED: React.FC<StatusLEDProps> = ({
  status,
  label,
  size = 'md',
  className = '',
}) => {
  const cfg = LED_STYLES[status] || LED_STYLES.idle;

  const sizeClasses =
    size === 'sm'
      ? 'w-2 h-2'
      : size === 'lg'
      ? 'w-3.5 h-3.5'
      : 'w-2.5 h-2.5';

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Outer tactile bezel */}
      <div className="p-1 rounded-full bg-[#24262b] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.06)] flex items-center justify-center">
        {/* Glowing LED bead */}
        <div
          className={`rounded-full relative ${sizeClasses} ${cfg.bg} ${cfg.glow} ${
            cfg.pulse ? 'animate-pulse' : ''
          }`}
        >
          {/* Light reflection highlight on bulb */}
          <div className="absolute top-[1px] left-[1.5px] w-[2px] h-[2px] bg-white/90 rounded-full" />
        </div>
      </div>
      {label && (
        <span className="text-xs font-medium text-slate-300 tracking-wide font-mono">
          {label}
        </span>
      )}
    </div>
  );
};
