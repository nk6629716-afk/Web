import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  ShieldCheck, 
  Trash2, 
  Layers, 
  Folder, 
  Zap, 
  FolderPlus,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  LogOut,
  User as UserIcon,
  ChevronDown
} from 'lucide-react';
import { Collaborator } from '@relay/shared';
import { NeumoButton } from '../ui/NeumoButton';
import { StatusLED } from '../ui/StatusLED';

export type AppView = 'studio' | 'projects' | 'integrations';

interface HeaderProps {
  workflowTitle: string;
  onTitleChange: (title: string) => void;
  revision: number;
  isDirty: boolean;
  isRunning: boolean;
  collaborators?: Collaborator[];
  onRun: () => void;
  onResetSample: () => void;
  onValidate: () => void;
  onClear: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'failed';
  currentView?: AppView;
  onViewChange?: (view: AppView) => void;
  projectName?: string;
  onCreateProjectClick?: () => void;
  onCreateWorkflowClick?: () => void;
  userEmail?: string | null;
  userDisplayName?: string | null;
  isDemoMode?: boolean;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  workflowTitle,
  onTitleChange,
  revision,
  isDirty,
  isRunning,
  onRun,
  onResetSample,
  onValidate,
  onClear,
  onSave,
  isSaving = false,
  saveStatus = 'idle',
  currentView = 'studio',
  onViewChange,
  projectName = 'Default Workspace',
  onCreateProjectClick,
  onCreateWorkflowClick,
  userEmail,
  userDisplayName,
  isDemoMode = false,
  onLogout,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute clear, honest save status text
  const saveStatusText = isSaving
    ? 'Saving…'
    : saveStatus === 'failed'
    ? 'Save failed'
    : saveStatus === 'saved'
    ? 'Saved'
    : isDirty
    ? 'Unsaved changes'
    : 'Saved';

  return (
    <header className="h-16 bg-[#292b30] shadow-[0_4px_12px_rgba(0,0,0,0.35)] border-b border-white/[0.04] px-3 sm:px-5 flex items-center justify-between z-30 select-none gap-2 sm:gap-4 overflow-x-auto overflow-y-hidden">
      {/* Left: Brand & Navigation Tabs & Workflow Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Brand Plaque */}
        <div 
          onClick={() => onViewChange?.('studio')}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#292b30] shadow-[3px_3px_6px_rgba(0,0,0,0.4),-3px_-3px_6px_rgba(255,255,255,0.08)] border border-white/[0.03] cursor-pointer shrink-0"
          title="Relay Studio"
        >
          <StatusLED status="cyan" size="sm" />
          <span className="font-black text-sm tracking-widest text-slate-100 uppercase">
            RELAY
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono font-bold text-[#00bfff] bg-[#222428] px-1.5 py-0.5 rounded shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
            v1.0
          </span>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center p-1 rounded-xl bg-[#24262b] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] border border-white/[0.03] gap-1 shrink-0">
          <button
            onClick={() => onViewChange?.('studio')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'studio'
                ? 'bg-[#292b30] text-[#00bfff] shadow-[2px_2px_4px_rgba(0,0,0,0.4),-2px_-2px_4px_rgba(255,255,255,0.08)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Studio Canvas"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Studio</span>
          </button>

          <button
            onClick={() => onViewChange?.('projects')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'projects'
                ? 'bg-[#292b30] text-[#00bfff] shadow-[2px_2px_4px_rgba(0,0,0,0.4),-2px_-2px_4px_rgba(255,255,255,0.08)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Projects Dashboard"
          >
            <Folder className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Projects</span>
          </button>

          <button
            onClick={() => onViewChange?.('integrations')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'integrations'
                ? 'bg-[#292b30] text-[#00ff88] shadow-[2px_2px_4px_rgba(0,0,0,0.4),-2px_-2px_4px_rgba(255,255,255,0.08)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Integrations Hub"
          >
            <Zap className="w-3.5 h-3.5 text-[#00ff88]" />
            <span className="hidden sm:inline">Integrations</span>
          </button>
        </div>

        {/* Global "+ New Project" Button */}
        {onCreateProjectClick && (
          <NeumoButton
            onClick={onCreateProjectClick}
            size="sm"
            icon={<FolderPlus className="w-3.5 h-3.5 text-[#00bfff]" />}
            title="Create a new workflow project"
            className="hidden xl:inline-flex text-xs font-semibold shrink-0"
          >
            + New Project
          </NeumoButton>
        )}

        {/* Studio "+ New Workflow" Button */}
        {currentView === 'studio' && onCreateWorkflowClick && (
          <NeumoButton
            onClick={onCreateWorkflowClick}
            size="sm"
            icon={<Zap className="w-3.5 h-3.5 text-[#00ff88]" />}
            title="Create a new workflow in active project"
            className="hidden md:inline-flex text-xs font-semibold shrink-0"
          >
            + New Workflow
          </NeumoButton>
        )}

        {/* Studio Workflow Toolbar: Name, Revision, Save Button & Honest Status */}
        {currentView === 'studio' && (
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 pl-1 border-l border-white/[0.04]">
            {/* Editable Workflow Title */}
            <input
              type="text"
              value={workflowTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              className="bg-[#24262b] text-slate-100 font-medium px-2.5 py-1.5 rounded-lg text-xs w-32 sm:w-44 md:w-48 lg:w-56 border border-white/[0.03] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.06)] focus:border-[#00bfff]/50 outline-none transition-all truncate shrink-0"
              title="Click to rename workflow"
              aria-label="Workflow Name"
            />

            {/* Revision Pill */}
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#24262b] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)] border border-white/[0.03] text-[11px] font-mono text-slate-400 shrink-0"
              title={`Workflow Revision #${revision}`}
            >
              <span>REV</span>
              <span className="text-[#00bfff] font-bold">#{revision}</span>
            </div>

            {/* Save Workflow Button — Clearly placed right next to name and revision */}
            {onSave && (
              <NeumoButton
                onClick={onSave}
                disabled={isSaving}
                size="sm"
                variant={isDirty ? 'primary' : 'default'}
                data-testid="save-workflow-button"
                aria-label="Save Workflow"
                className={`font-semibold tracking-wide shrink-0 transition-all ${
                  isDirty
                    ? 'text-[#00bfff] border-[#00bfff]/50 shadow-[0_0_12px_rgba(0,191,255,0.25)]'
                    : 'text-slate-100 hover:text-[#00bfff] border-white/[0.08]'
                }`}
                icon={
                  isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00bfff]" />
                  ) : saveStatus === 'saved' ? (
                    <Check className="w-3.5 h-3.5 text-[#00ff88]" />
                  ) : saveStatus === 'failed' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-[#ff3366]" />
                  ) : (
                    <Save className={`w-3.5 h-3.5 ${isDirty ? 'text-[#00bfff]' : 'text-slate-300'}`} />
                  )
                }
                title={
                  isSaving
                    ? 'Saving workflow to database...'
                    : saveStatus === 'failed'
                    ? 'Save failed — click to retry'
                    : isDirty
                    ? 'Save current workflow nodes and configuration'
                    : 'All changes saved to database (click to save again)'
                }
              >
                <span className="whitespace-nowrap">
                  {isSaving
                    ? 'Saving...'
                    : saveStatus === 'saved'
                    ? 'Saved'
                    : saveStatus === 'failed'
                    ? 'Retry Save'
                    : 'Save Workflow'}
                </span>
              </NeumoButton>
            )}

            {/* Honest Save Status Pill */}
            <div 
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#24262b] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] border border-white/[0.03] shrink-0"
              title={saveStatusText}
            >
              <StatusLED
                status={
                  isSaving || saveStatus === 'saving'
                    ? 'cyan'
                    : saveStatus === 'failed'
                    ? 'failed'
                    : isDirty
                    ? 'idle'
                    : 'success'
                }
                size="sm"
              />
              <span className="text-[11px] font-mono font-medium text-slate-300 whitespace-nowrap">
                {saveStatusText}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Validation, Run & User Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Validation Button */}
        {currentView === 'studio' && (
          <NeumoButton
            onClick={onValidate}
            size="sm"
            icon={<ShieldCheck className="w-3.5 h-3.5 text-[#00ff88]" />}
            title="Validate workflow graph integrity"
            className="hidden xl:inline-flex shrink-0"
          >
            Validate
          </NeumoButton>
        )}

        {/* Reset Sample Button */}
        {currentView === 'studio' && (
          <NeumoButton
            onClick={onResetSample}
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5 text-[#00bfff]" />}
            title="Reload demo onboarding workflow template"
            className="hidden 2xl:inline-flex shrink-0"
          >
            Reset Sample
          </NeumoButton>
        )}

        {/* Clear Canvas Button */}
        {currentView === 'studio' && (
          <NeumoButton
            onClick={onClear}
            size="sm"
            variant="danger"
            icon={<Trash2 className="w-3.5 h-3.5 text-[#ff3366]" />}
            title="Clear canvas"
            className="hidden 2xl:inline-flex shrink-0"
          />
        )}

        {/* Primary RUN Button */}
        {currentView === 'studio' && (
          <NeumoButton
            onClick={onRun}
            disabled={isRunning}
            active={isRunning}
            variant="primary"
            size="md"
            className="font-bold tracking-wide shrink-0 shadow-[5px_5px_10px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.08)]"
            icon={
              isRunning ? (
                <div className="w-3.5 h-3.5 border-2 border-[#00bfff]/30 border-t-[#00bfff] rounded-full animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-[#00bfff] text-[#00bfff]" />
              )
            }
          >
            <span className="whitespace-nowrap">
              {isRunning ? 'EXECUTING...' : 'RUN WORKFLOW'}
            </span>
          </NeumoButton>
        )}

        {/* User Profile & Account Menu */}
        {(userEmail || onLogout || isDemoMode) && (
          <div className="relative shrink-0 pl-1 sm:pl-2 border-l border-white/[0.06]" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              data-testid="user-profile-menu-button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#292b30] shadow-[3px_3px_6px_rgba(0,0,0,0.4),-3px_-3px_6px_rgba(255,255,255,0.08)] border transition-all ${
                isDemoMode ? 'border-amber-500/30 text-amber-300' : 'border-white/[0.04] text-slate-200'
              } hover:text-white cursor-pointer select-none`}
              title="User Account & Settings"
              aria-label="User profile menu"
            >
              <div className="w-5 h-5 rounded-full bg-[#24262b] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] flex items-center justify-center text-[#00bfff]">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold max-w-[120px] truncate leading-tight">
                  {isDemoMode ? 'Demo Mode' : userDisplayName || (userEmail ? userEmail.split('@')[0] : 'User')}
                </span>
                <span className={`text-[9px] font-mono leading-tight ${isDemoMode ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                  {isDemoMode ? 'Offline Demo' : 'Supabase Auth'}
                </span>
              </div>
              {isDemoMode && (
                <span className="sm:hidden text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded">
                  DEMO
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <div 
                data-testid="user-profile-dropdown"
                className="absolute right-0 top-12 w-64 rounded-2xl bg-[#292b30] border border-white/[0.06] shadow-[8px_8px_20px_rgba(0,0,0,0.6),-6px_-6px_16px_rgba(255,255,255,0.06)] p-3 z-50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {/* User Info Header */}
                <div className="p-2.5 rounded-xl bg-[#24262b] border border-white/[0.03] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100 truncate">
                      {userDisplayName || (isDemoMode ? 'Offline Guest' : 'Account')}
                    </span>
                    <StatusLED status={isDemoMode ? 'idle' : 'success'} size="sm" />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 truncate">
                    {userEmail || 'No email associated'}
                  </div>
                  <div className="pt-1">
                    {isDemoMode ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                        Demo Mode (Offline)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded border border-[#00ff88]/20">
                        Supabase Authenticated
                      </span>
                    )}
                  </div>
                </div>

                {/* Logout action */}
                {onLogout && (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogout();
                    }}
                    data-testid="logout-menu-item"
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#ff5580] hover:bg-[#ff3366]/10 border border-transparent hover:border-[#ff3366]/20 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-[#ff5580]" />
                    <span>{isDemoMode ? 'Exit Demo Mode' : 'Log Out'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
