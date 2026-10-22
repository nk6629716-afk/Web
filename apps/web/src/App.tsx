import React, { useState } from 'react';
import { Studio } from './pages/Studio';
import { AppView } from './components/layout/Header';
import { CreateProjectModal } from './components/CreateProjectModal';
import { Project } from '@relay/shared';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('studio');
  const [activeProjectId, setActiveProjectId] = useState<string>('demo-project-001');
  const [activeProjectName, setActiveProjectName] = useState<string>('Default Workspace');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleProjectCreated = (newProject: Project) => {
    setActiveProjectId(newProject.id);
    setActiveProjectName(newProject.name);
    setCurrentView('studio');
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
      />

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
};

export default App;
