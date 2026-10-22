import React, { useState, useEffect } from 'react';
import { 
  FolderPlus, 
  Search, 
  Folder, 
  ArrowRight, 
  Clock, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  ExternalLink
} from 'lucide-react';
import { Project } from '@relay/shared';
import { api, DatabaseStatus } from '../lib/api';
import { NeumoButton } from './ui/NeumoButton';
import { NeumoCard } from './ui/NeumoCard';
import { StatusLED } from './ui/StatusLED';
import { CreateProjectModal } from './CreateProjectModal';

interface ProjectsViewProps {
  onSelectProject: (projectId: string, projectName: string) => void;
  activeProjectId?: string;
  onOpenIntegrations: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  onSelectProject,
  activeProjectId,
  onOpenIntegrations,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getProjects();
      setProjects(list);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError(err.message || 'Unable to connect to projects service.');
    } finally {
      setLoading(false);
    }
  };

  const checkDbStatus = async () => {
    try {
      const status = await api.getDatabaseStatus();
      setDbStatus(status);
    } catch {
      // Endpoint may be starting up
    }
  };

  useEffect(() => {
    fetchProjects();
    checkDbStatus();
  }, []);

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    onSelectProject(newProject.id, newProject.name);
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#292b30] p-8 text-slate-100 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.05]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black tracking-wide uppercase text-slate-100">
                Projects & Workspaces
              </h1>
              {dbStatus && (
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono border ${
                    dbStatus.status === 'ready'
                      ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20'
                      : 'bg-[#ffaa00]/10 text-[#ffaa00] border-[#ffaa00]/20'
                  }`}
                  title={dbStatus.message}
                >
                  <StatusLED status={dbStatus.status === 'ready' ? 'success' : 'idle'} size="sm" />
                  <span>{dbStatus.status === 'ready' ? 'DB READY' : 'SCHEMA PENDING'}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage your Relay workflow collections and external app API scopes
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <NeumoButton
              onClick={fetchProjects}
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />}
              title="Refresh projects"
            />
            <NeumoButton
              onClick={onOpenIntegrations}
              size="sm"
              icon={<ExternalLink className="w-3.5 h-3.5 text-[#00bfff]" />}
            >
              Integrations Hub
            </NeumoButton>
            <NeumoButton
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
              size="sm"
              icon={<FolderPlus className="w-4 h-4 text-[#00bfff]" />}
              className="font-bold tracking-wide shadow-[5px_5px_10px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.08)]"
            >
              + Create Project
            </NeumoButton>
          </div>
        </div>

        {/* Database Notice Alert if Schema Migration Pending */}
        {dbStatus && dbStatus.status === 'migration_required' && (
          <div className="p-4 rounded-2xl bg-[#ffaa00]/10 border border-[#ffaa00]/20 text-xs space-y-2">
            <div className="flex items-center gap-2 text-[#ffaa00] font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Supabase Database Schema Setup Notice</span>
            </div>
            <p className="text-slate-300">
              The backend is connected to Supabase, but the schema cache does not yet show the required tables. To persist created projects and executions to PostgreSQL:
            </p>
            <div className="bg-[#212327] p-3 rounded-xl font-mono text-[11px] text-slate-200 border border-white/[0.04]">
              1. Open Supabase Dashboard → SQL Editor<br />
              2. Paste and run <span className="text-[#00bfff]">{dbStatus.migrationFile}</span><br />
              3. Execute: <span className="text-[#00ff88]">NOTIFY pgrst, 'reload schema';</span>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects by name or ID..."
              className="w-full bg-[#24262b] text-slate-100 font-medium pl-10 pr-4 py-2 rounded-xl text-xs border border-white/[0.04] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] focus:border-[#00bfff]/50 outline-none transition-all placeholder:text-slate-500"
            />
          </div>
          <span className="text-xs font-mono text-slate-400">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'Project' : 'Projects'}
          </span>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-[#ff3366]/10 border border-[#ff3366]/20 text-[#ff3366] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <NeumoButton onClick={fetchProjects} size="sm" variant="danger">
              Retry
            </NeumoButton>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-[#24262b] animate-pulse border border-white/[0.03]"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <NeumoCard variant="recess" className="p-12 text-center max-w-xl mx-auto space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#292b30] shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.06)] border border-white/[0.03] mx-auto flex items-center justify-center">
              <FolderPlus className="w-8 h-8 text-[#00bfff]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-100">
                No Projects Found
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Projects are isolated workspaces that organize your workflows, execution runs, and external integration APIs (such as CivicConnect).
              </p>
            </div>
            <NeumoButton
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
              size="md"
              icon={<FolderPlus className="w-4 h-4 text-[#00bfff]" />}
              className="font-bold tracking-wide"
            >
              Create Your First Project
            </NeumoButton>
          </NeumoCard>
        )}

        {/* Project Grid */}
        {!loading && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const isActive = project.id === activeProjectId;
              return (
                <div
                  key={project.id}
                  className={`p-5 rounded-2xl bg-[#292b30] border transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'border-[#00bfff] shadow-[0_0_15px_rgba(0,191,255,0.2),6px_6px_12px_rgba(0,0,0,0.45)]'
                      : 'border-white/[0.04] shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.06)] hover:border-white/[0.1]'
                  }`}
                  onClick={() => onSelectProject(project.id, project.name)}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#23252a] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)] border border-white/[0.03] flex items-center justify-center">
                      <Folder className={`w-5 h-5 ${isActive ? 'text-[#00bfff]' : 'text-slate-400'}`} />
                    </div>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-[#00bfff]/10 text-[#00bfff] text-[10px] font-mono font-bold border border-[#00bfff]/30">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-100 truncate mb-1">
                    {project.name}
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 truncate mb-4">
                    ID: {project.id}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Active'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#00bfff] font-semibold hover:underline">
                      <span>Open Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
};
