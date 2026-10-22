import React from 'react';

interface NeumoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const NeumoButton: React.FC<NeumoButtonProps> = ({
  variant = 'default',
  size = 'md',
  active = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles =
    size === 'sm'
      ? 'px-2.5 py-1 text-xs gap-1.5'
      : size === 'lg'
      ? 'px-5 py-2.5 text-sm gap-2.5'
      : 'px-3.5 py-2 text-xs gap-2';

  const variantStyles =
    variant === 'primary'
      ? 'text-[#00bfff] hover:text-[#38d4ff] font-semibold'
      : variant === 'success'
      ? 'text-[#00ff88] hover:text-[#33ffa0] font-semibold'
      : variant === 'danger'
      ? 'text-[#ff3366] hover:text-[#ff5580]'
      : 'text-slate-200 hover:text-white';

  const shadowClass = active
    ? 'shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.08)] translate-y-[1px]'
    : 'shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.08)] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.08)] active:translate-y-[1px]';

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl bg-[#292b30] border border-white/[0.04] select-none transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${shadowClass} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};
