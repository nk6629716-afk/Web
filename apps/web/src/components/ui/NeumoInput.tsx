import React from 'react';

interface NeumoInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const NeumoInput: React.FC<NeumoInputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[11px] font-medium text-slate-400 mb-1.5 tracking-wide">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-[#24262b] text-slate-100 placeholder:text-slate-500 rounded-lg px-3 py-2 text-xs border border-white/[0.04] outline-none shadow-[inset_3px_3px_6px_rgba(0,0,0,0.45),inset_-3px_-3px_6px_rgba(255,255,255,0.06)] focus:border-[#00bfff]/40 focus:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.5),0_0_8px_rgba(0,191,255,0.25)] transition-all font-sans ${className}`}
        {...props}
      />
      {error && <span className="text-[10px] text-[#ff3366] mt-1 block">{error}</span>}
    </div>
  );
};

interface NeumoTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const NeumoTextarea: React.FC<NeumoTextareaProps> = ({
  label,
  error,
  className = '',
  rows = 4,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[11px] font-medium text-slate-400 mb-1.5 tracking-wide">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`w-full bg-[#222429] text-slate-200 placeholder:text-slate-500 rounded-lg p-2.5 text-xs font-mono border border-white/[0.04] outline-none resize-none shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.06)] focus:border-[#00bfff]/40 focus:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5),0_0_8px_rgba(0,191,255,0.25)] transition-all ${className}`}
        {...props}
      />
      {error && <span className="text-[10px] text-[#ff3366] mt-1 block">{error}</span>}
    </div>
  );
};

interface NeumoSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

export const NeumoSelect: React.FC<NeumoSelectProps> = ({
  label,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[11px] font-medium text-slate-400 mb-1.5 tracking-wide">
          {label}
        </label>
      )}
      <select
        className={`w-full bg-[#24262b] text-slate-100 rounded-lg px-3 py-2 text-xs border border-white/[0.04] outline-none shadow-[inset_3px_3px_6px_rgba(0,0,0,0.45),inset_-3px_-3px_6px_rgba(255,255,255,0.06)] focus:border-[#00bfff]/40 transition-all cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};
