import React from 'react';
import { useWorkflow } from './hooks/useWorkflow';
import { TopNav } from './components/TopNav';
import { NodePalette } from './components/NodePalette';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { ExecutionConsole } from './components/ExecutionConsole';
import { ConflictModal } from './components/ConflictModal';
import { NodeType } from '@relay/shared';

export const App: React.FC = () => {
  const {
    workflow,
    nodes,
    edges,
    collaborators,
    selectedNode,
    selectedNodeId,
    isConnected,
    isSaving,
    hasUnsavedChanges,
    isRunning,
    executionSteps,
    executionStatus,
    executionDuration,
    executionError,
    conflictWorkflow,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateNodeData,
    deleteNode,
    setSelectedNodeId,
    saveWorkflow,
    runWorkflowCTA,
    clearExecutionConsole,
    acceptServerConflict,
    forceOverwriteConflict
  } = useWorkflow();

  const handleDropNode = (type: NodeType, position: { x: number; y: number }) => {
    const id = `node-${type}-${Date.now().toString(36)}`;
    const newNode = {
      id,
      type,
      position,
      data: {
        label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type,
        config: type === 'trigger' ? { initialPayload: { message: "Sample" } }
              : type === 'transform' ? { operation: 'trim' }
              : type === 'condition' ? { operator: 'equals', targetValue: 'true' }
              : { destination: 'response' },
        status: 'idle' as const
      }
    };
    onNodesChange([{ type: 'add', item: newNode } as any]);
    setSelectedNodeId(id);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-studio-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Navigation */}
      <TopNav
        workflowName={workflow.name}
        revision={workflow.revision}
        collaborators={collaborators}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        isRunning={isRunning}
        isConnected={isConnected}
        onRunWorkflow={runWorkflowCTA}
        onSaveWorkflow={() => saveWorkflow()}
        onNameChange={(name) => {
          // Local name change
        }}
      />

      {/* Main Studio Body: Palette + Canvas + Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        <NodePalette onAddNode={(type) => addNode(type)} />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(id) => setSelectedNodeId(id)}
            onPaneClick={() => setSelectedNodeId(null)}
            onDropNode={handleDropNode}
          />

          <ExecutionConsole
            steps={executionSteps}
            status={executionStatus}
            durationMs={executionDuration}
            error={executionError}
            onClear={clearExecutionConsole}
          />
        </div>

        <Inspector
          selectedNode={selectedNode}
          onUpdateNode={updateNodeData}
          onDeleteNode={deleteNode}
          onClose={() => setSelectedNodeId(null)}
        />
      </div>

      {/* Stale Revision Conflict Warning */}
      <ConflictModal
        isOpen={!!conflictWorkflow}
        serverWorkflow={conflictWorkflow}
        localRevision={workflow.revision}
        onAcceptServer={acceptServerConflict}
        onForceOverwrite={forceOverwriteConflict}
      />
    </div>
  );
};

export default App;
