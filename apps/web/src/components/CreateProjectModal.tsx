import React, { useState } from 'react';
import { X, FolderPlus, AlertCircle, CheckCircle2, Database, Loader2 } from 'lucide-react';
import { Project } from '@relay/shared';
import { api } from '../lib/api';
import { NeumoButton } from './ui/NeumoButton';
import { StatusLED } from './ui/StatusLED';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Project name is required.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Project name must be at least 2 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setErrorAction(null);
    setSuccessMessage(null);

    try {
      const project = await api.createProject(trimmed);
      setSuccessMessage(`Project "${project.name}" created successfully!`);
      setName('');
      setTimeout(() => {
        onProjectCreated(project);
        onClose();
        setSuccessMessage(null);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to create project:', err);
      const isSchemaErr =
        err.message?.includes('schema cache') ||
        err.message?.includes('database/migrations') ||
        err.code === 'DATABASE_MIGRATION_REQUIRED';

      if (isSchemaErr) {
        setError(
          'Supabase database table "projects" is not initialized in the schema cache.'
        );
        setErrorAction(
          'Run the SQL in database/migrations/001_initial_schema.sql in your Supabase SQL Editor and run: NOTIFY pgrst, \'reload schema\';'
        );
      } else {
        setError(err.message || 'Failed to create project. Please verify backend connectivity.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#292b30] rounded-2xl border border-white/[0.06] shadow-[12px_12px_24px_rgba(0,0,0,0.6),-12px_-12px_24px_rgba(255,255,255,0.06)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#24262b] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)] border border-white/[0.04] flex items-center justify-center">
              <FolderPlus className="w-4 h-4 text-[#00bfff]" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide text-slate-100">
                Create New Project
              </h3>
              <p className="text-[11px] text-slate-400">
                Workspaces for automated workflows & external APIs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Project Name <span className="text-[#ff3366]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                placeholder="e.g. CivicConnect Demo, Ticket Router"
                className="w-full bg-[#23252a] text-slate-100 font-medium px-4 py-2.5 rounded-xl text-xs border border-white/[0.04] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.05)] focus:border-[#00bfff]/60 outline-none transition-all placeholder:text-slate-500"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Unique name to organize workflows, versions, and integration endpoints.
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-[#ff3366]/10 border border-[#ff3366]/20 text-[#ff3366] text-xs space-y-1.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
              {errorAction && (
                <div className="pl-6 text-[11px] text-slate-300 bg-black/20 p-2 rounded-lg font-mono">
                  {errorAction}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <NeumoButton
              type="button"
              onClick={onClose}
              disabled={loading}
              size="sm"
            >
              Cancel
            </NeumoButton>
            <NeumoButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading || !name.trim()}
              icon={
                loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00bfff]" />
                ) : (
                  <FolderPlus className="w-3.5 h-3.5 text-[#00bfff]" />
                )
              }
            >
              {loading ? 'Creating Project...' : 'Create Project'}
            </NeumoButton>
          </div>
        </form>
      </div>
    </div>
  );
};
