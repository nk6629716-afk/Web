import React, { useState } from 'react';
import { Studio } from './pages/Studio';
import { AuthPage } from './pages/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppView } from './components/layout/Header';
import { CreateProjectModal } from './components/CreateProjectModal';
import { StatusLED } from './components/ui/StatusLED';
import { Loader2 } from 'lucide-react';
import { Project } from '@relay/shared';
import { api } from './lib/api';

const RelayDashboard: React.FC = () => {
  const { user, session, loading, signOut, isConfigured } = useAuth();
  const [demoBypass, setDemoBypass] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('relay:demo_bypass') === 'true';
    }
    return false;
  });

  const [currentView, setCurrentView] = useState<AppView>('studio');
  const [activeProjectId, setActiveProjectId] = useState<string>('demo-project-001');
  const [activeProjectName, setActiveProjectName] = useState<string>('Default Workspace');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  React.useEffect(() => {
    const loadDefaultProject = async () => {
      try {
        const projects = await api.getProjects();
        if (projects && projects.length > 0) {
          setActiveProjectId(projects[0].id);
          setActiveProjectName(projects[0].name);
        }
      } catch {
        // Fallback to initial
      }
    };
    loadDefaultProject();
  }, []);

  const handleProjectCreated = (newProject: Project) => {
    setActiveProjectId(newProject.id);
    setActiveProjectName(newProject.name);
    setCurrentView('studio');
  };

  const handleBypassDemo = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('relay:demo_bypass', 'true');
    }
    setDemoBypass(true);
  };

  // 1. Initializing auth session check
  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#202226] flex flex-col items-center justify-center gap-4 text-slate-100 select-none">
        <div className="p-4 rounded-2xl bg-[#292b30] shadow-[6px_6px_16px_rgba(0,0,0,0.5),-6px_-6px_16px_rgba(255,255,255,0.06)] border border-white/[0.04] flex items-center gap-3">
          <StatusLED status="cyan" size="md" />
          <span className="font-black text-sm tracking-widest text-slate-100 uppercase">
            RELAY
          </span>
          <Loader2 className="w-4 h-4 animate-spin text-[#00bfff]" />
        </div>
        <span className="text-xs font-mono text-slate-400">Verifying session credentials...</span>
      </div>
    );
  }

  // 2. Unauthenticated: show Login/Signup flow
  const isAuthenticated = Boolean(session && user);
  if (!isAuthenticated && !demoBypass) {
    return <AuthPage onBypassDemo={handleBypassDemo} />;
  }

  // 3. Authenticated or Demo Mode
  const isDemoMode = !isAuthenticated && demoBypass;
  const displayUserEmail = user?.email || (isDemoMode ? 'Demo Mode (Offline)' : null);
  const displayUserName = (user?.user_metadata?.display_name as string) || (user?.user_metadata?.full_name as string) || null;

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('relay:demo_bypass');
    }
    setDemoBypass(false);
    await signOut();
  };

  return (
    <>
      <Studio
        currentView={currentView}
        onViewChange={setCurrentView}
        activeProjectId={activeProjectId}
        activeProjectName={activeProjectName}
        onSelectProject={(id, name) => {
          setActiveProjectId(id);
          setActiveProjectName(name);
          setCurrentView('studio');
        }}
        onCreateProjectClick={() => setIsCreateModalOpen(true)}
        userEmail={displayUserEmail}
        userDisplayName={displayUserName}
        isDemoMode={isDemoMode}
        onLogout={handleLogout}
      />

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RelayDashboard />
    </AuthProvider>
  );
};

export default App;
