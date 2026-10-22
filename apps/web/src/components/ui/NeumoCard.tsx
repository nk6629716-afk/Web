import React from 'react';

interface NeumoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'protrude' | 'recess' | 'protrude-sm' | 'recess-sm';
  children: React.ReactNode;
  className?: string;
}

export const NeumoCard: React.FC<NeumoCardProps> = ({
  variant = 'protrude',
  children,
  className = '',
  ...props
}) => {
  const shadowClass =
    variant === 'recess'
      ? 'shadow-[inset_6px_6px_12px_rgba(0,0,0,0.4),inset_-6px_-6px_12px_rgba(255,255,255,0.08)]'
      : variant === 'protrude-sm'
      ? 'shadow-[3px_3px_6px_rgba(0,0,0,0.4),-3px_-3px_6px_rgba(255,255,255,0.08)]'
      : variant === 'recess-sm'
      ? 'shadow-[inset_3px_3px_6px_rgba(0,0,0,0.4),inset_-3px_-3px_6px_rgba(255,255,255,0.08)]'
      : 'shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.08)]';

  return (
    <div
      className={`bg-[#292b30] rounded-xl border border-white/[0.03] ${shadowClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
