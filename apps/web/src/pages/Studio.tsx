import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import {
  Collaborator,
  Execution,
  ExecutionStepResult,
  NodeType,
  Workflow,
  WorkflowNode,
  AppIntegrationSafeResponse,
} from '@relay/shared';
import { SAMPLE_WORKFLOW } from '../lib/sampleWorkflow';
import { executeWorkflow, validateGraph } from '../lib/localEngine';
import { api } from '../lib/api';
import { Header, AppView } from '../components/layout/Header';
import { ConflictModal } from '../components/ConflictModal';
import { ProjectsView } from '../components/ProjectsView';
import { IntegrationsView } from '../components/IntegrationsView';
import { NodePalette } from '../components/layout/NodePalette';
import { WorkflowCanvas } from '../components/WorkflowCanvas';
import { InspectorPanel } from '../components/layout/InspectorPanel';
import { ExecutionConsole } from '../components/ExecutionConsole';
import { StatusLED } from '../components/ui/StatusLED';
import { X, Loader2 } from 'lucide-react';

const INITIAL_COLLABORATORS: Collaborator[] = [
  {
    userId: 'u_1',
    displayName: 'Alex M.',
    color: '#00bfff',
    lastActive: new Date().toISOString(),
  },
  {
    userId: 'u_2',
    displayName: 'Elena R.',
    color: '#8b5cf6',
    lastActive: new Date().toISOString(),
  },
  {
    userId: 'u_3',
    displayName: 'David K.',
    color: '#00ff88',
    lastActive: new Date().toISOString(),
  },
];

export interface StudioProps {
  currentView?: AppView;
  onViewChange?: (view: AppView) => void;
  activeProjectId?: string;
  activeProjectName?: string;
  onSelectProject?: (projectId: string, projectName: string) => void;
  onCreateProjectClick?: () => void;
}

export const Studio: React.FC<StudioProps> = ({
  currentView = 'studio',
  onViewChange,
  activeProjectId = 'demo-project-001',
  activeProjectName = 'Default Workspace',
  onSelectProject,
  onCreateProjectClick,
}) => {
  const [workflow, setWorkflow] = useState<Workflow>(SAMPLE_WORKFLOW);
  const [workflowTitle, setWorkflowTitle] = useState(SAMPLE_WORKFLOW.name);
  const [revision, setRevision] = useState(SAMPLE_WORKFLOW.revision);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [conflictWorkflow, setConflictWorkflow] = useState<Workflow | null>(null);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-transform-1');
  const [isRunning, setIsRunning] = useState(false);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(
    null
  );

  // Initialize React Flow nodes & edges
  const initialNodes: Node[] = useMemo(() => {
    return workflow.graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    }));
  }, []);

  const initialEdges: Edge[] = useMemo(() => {
    return workflow.graph.edges.map((e) => ({
      id: e.id,
      type: 'neon',
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label: e.label,
      animated: false,
    }));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [availableIntegrations, setAvailableIntegrations] = useState<AppIntegrationSafeResponse[]>([]);

  const loadIntegrations = useCallback(async () => {
    try {
      const list = await api.getIntegrations();
      setAvailableIntegrations(list);
    } catch (err) {
      console.warn('Could not load integrations for studio inspector:', err);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  };

  // Load workflow from backend on mount or when switching active workflow
  const loadWorkflow = useCallback(async (targetId: string = workflow.id) => {
    setIsLoadingWorkflow(true);
    try {
      const res = await api.getWorkflow(targetId);
      if (res && res.workflow) {
        const wf = res.workflow;
        setWorkflow(wf);
        setWorkflowTitle(wf.name);
        setRevision(wf.revision);

        setNodes(
          (wf.graph?.nodes || []).map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          }))
        );

        setEdges(
          (wf.graph?.edges || []).map((e) => ({
            id: e.id,
            type: 'neon',
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            label: e.label,
            animated: false,
          }))
        );

        setIsDirty(false);
        setSaveStatus('idle');
        setConflictWorkflow(null);
      }
    } catch (err: any) {
      console.warn('Backend unavailable on initial load, using default demo workflow:', err?.message);
    } finally {
      setIsLoadingWorkflow(false);
    }
  }, [workflow.id, setNodes, setEdges]);

  useEffect(() => {
    loadWorkflow(workflow.id);
  }, []);

  // Save workflow action with optimistic locking & revision verification
  const handleSaveWorkflow = useCallback(
    async (forcedRevision?: number) => {
      if (isSaving) return;

      const currentGraph = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type as NodeType,
          position: n.position,
          data: n.data as any,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          label: typeof e.label === 'string' ? e.label : undefined,
        })),
      };

      // Validate graph before saving
      const validation = validateGraph(currentGraph);
      if (!validation.isValid) {
        showToast('error', `Cannot save: ${validation.errors.join('; ')}`);
        setSaveStatus('failed');
        return;
      }

      const targetRevision = forcedRevision !== undefined ? forcedRevision : revision;
      setIsSaving(true);
      setSaveStatus('saving');

      try {
        const res = await api.saveWorkflow(
          workflow.id,
          currentGraph,
          workflowTitle,
          targetRevision
        );

        if (res && res.workflow) {
          setWorkflow(res.workflow);
          setRevision(res.workflow.revision);
          setWorkflowTitle(res.workflow.name);
          setIsDirty(false);
          setSaveStatus('saved');
          setConflictWorkflow(null);
          showToast('success', `Workflow "${res.workflow.name}" saved (rev #${res.workflow.revision})!`);
          setTimeout(() => {
            setSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
          }, 3000);
        }
      } catch (err: any) {
        setSaveStatus('failed');
        if (err.status === 409 || err.code === 'STALE_REVISION') {
          const canonical = err.data?.canonicalWorkflow || null;
          setConflictWorkflow(canonical);
          showToast('error', 'Conflict: Another session modified this workflow.');
        } else {
          showToast('error', `Save failed: ${err.message || 'Server error'}`);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, nodes, edges, revision, workflow.id, workflowTitle]
  );

  // Conflict resolution handlers
  const handleAcceptServerConflict = useCallback(() => {
    if (!conflictWorkflow) return;
    setWorkflow(conflictWorkflow);
    setWorkflowTitle(conflictWorkflow.name);
    setRevision(conflictWorkflow.revision);
    setNodes(
      (conflictWorkflow.graph?.nodes || []).map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      }))
    );
    setEdges(
      (conflictWorkflow.graph?.edges || []).map((e) => ({
        id: e.id,
        type: 'neon',
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
        animated: false,
      }))
    );
    setIsDirty(false);
    setSaveStatus('idle');
    setConflictWorkflow(null);
    showToast('info', `Loaded server revision v${conflictWorkflow.revision}.`);
  }, [conflictWorkflow, setNodes, setEdges]);

  const handleForceOverwriteConflict = useCallback(() => {
    if (!conflictWorkflow) return;
    const serverRev = conflictWorkflow.revision;
    setConflictWorkflow(null);
    handleSaveWorkflow(serverRev);
  }, [conflictWorkflow, handleSaveWorkflow]);

  // Track node / edge changes to dirty state
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      const isDragStop = changes.some((c: any) => c.type === 'position' && c.dragging === false);
      const isRemoval = changes.some((c: any) => c.type === 'remove');
      if (isDragStop || isRemoval) {
        setIsDirty(true);
      }
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      if (changes.some((c: any) => c.type === 'remove')) {
        setIsDirty(true);
      }
    },
    [onEdgesChange]
  );

  // Node selection
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Connect edges
  const handleConnect = useCallback(
    (connection: Connection) => {
      setIsDirty(true);
      const isTrueHandle = connection.sourceHandle === 'true';
      const isFalseHandle = connection.sourceHandle === 'false';
      const label = isTrueHandle ? 'True' : isFalseHandle ? 'False' : undefined;

      const newEdge: Edge = {
        id: `e_${connection.source}_${connection.target}_${Date.now()}`,
        type: 'neon',
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        label,
        animated: false,
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const getDefaultConfig = (type: NodeType): Record<string, any> => {
    switch (type) {
      case 'trigger':
        return {
          payload: JSON.stringify({ event: 'custom_trigger', timestamp: new Date().toISOString() }, null, 2),
        };
      case 'transform':
        return {
          operation: 'trim',
          field: 'event',
          outputField: 'cleanedEvent',
        };
      case 'condition':
        return {
          field: 'event',
          operator: 'equals',
          value: 'custom_trigger',
        };
      case 'output':
        return {
          title: 'Custom Output Result',
          messageTemplate: 'Completed flow with data.',
        };
      default:
        return {};
    }
  };

  // Add node from palette click
  const handleAddNode = useCallback(
    (type: NodeType) => {
      setIsDirty(true);
      const newNodeId = `node-${type}-${Date.now().toString().slice(-4)}`;
      const position = {
        x: 350 + Math.random() * 80,
        y: 200 + Math.random() * 80,
      };

      const newNode: Node = {
        id: newNodeId,
        type,
        position,
        data: {
          label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          nodeType: type,
          config: getDefaultConfig(type),
          status: 'idle',
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(newNodeId);
      showToast('info', `Added new ${type} module to canvas.`);
    },
    [setNodes]
  );

  // Add node on drop
  const handleDropNode = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      setIsDirty(true);
      const newNodeId = `node-${type}-${Date.now().toString().slice(-4)}`;

      const newNode: Node = {
        id: newNodeId,
        type,
        position,
        data: {
          label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          nodeType: type,
          config: getDefaultConfig(type),
          status: 'idle',
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(newNodeId);
    },
    [setNodes]
  );

  // Update node data (label or config)
  const handleUpdateNodeData = useCallback(
    (nodeId: string, updatedData: Partial<WorkflowNode['data']>) => {
      setIsDirty(true);
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                ...updatedData,
              },
            };
          }
          return n;
        })
      );
    },
    [setNodes]
  );

  // Delete node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setIsDirty(true);
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      showToast('info', `Deleted module "${nodeId}".`);
    },
    [selectedNodeId, setNodes, setEdges]
  );

  // Validate graph action
  const handleValidate = useCallback(() => {
    const currentGraph = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type as NodeType,
        position: n.position,
        data: n.data as any,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: typeof e.label === 'string' ? e.label : undefined,
      })),
    };

    const result = validateGraph(currentGraph);
    if (result.isValid) {
      showToast('success', 'Graph topology is valid! Ready for execution.');
    } else {
      showToast('error', `Validation error: ${result.errors.join('; ')}`);
    }
  }, [nodes, edges]);

  // Reset to sample workflow
  const handleResetSample = useCallback(() => {
    setNodes(
      SAMPLE_WORKFLOW.graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: { ...n.data, status: 'idle' },
      }))
    );
    setEdges(
      SAMPLE_WORKFLOW.graph.edges.map((e) => ({
        id: e.id,
        type: 'neon',
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
        animated: false,
      }))
    );
    setWorkflowTitle(SAMPLE_WORKFLOW.name);
    setRevision((prev) => prev + 1);
    setIsDirty(false);
    setExecution(null);
    setSelectedNodeId('node-transform-1');
    showToast('info', 'Loaded seeded demo onboarding workflow.');
  }, [setNodes, setEdges]);

  // Clear canvas
  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setExecution(null);
    setIsDirty(true);
    showToast('info', 'Canvas cleared.');
  }, [setNodes, setEdges]);

  // Run execution
  const handleRun = useCallback(async () => {
    if (isRunning) return;

    const currentGraph = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type as NodeType,
        position: n.position,
        data: n.data as any,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: typeof e.label === 'string' ? e.label : undefined,
      })),
    };

    // Reset node states to idle before start
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, status: 'pending' },
      }))
    );
    setEdges((eds) => eds.map((e) => ({ ...e, animated: false })));

    setIsRunning(true);
    setExecution({
      id: `exec_${Date.now()}`,
      workflowId: workflow.id,
      status: 'running',
      steps: [],
      startedAt: new Date().toISOString(),
    });

    try {
      const execResult = await executeWorkflow(
        workflow.id,
        currentGraph,
        (step: ExecutionStepResult) => {
          // Update node visual status
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === step.nodeId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    status: step.status,
                    lastRun: {
                      output: step.output,
                      error: step.errorMessage,
                      durationMs: step.durationMs,
                      executedAt: new Date().toISOString(),
                    },
                  },
                };
              }
              return n;
            })
          );

          // Animate edges when node succeeds
          if (step.status === 'succeeded') {
            setEdges((eds) =>
              eds.map((e) => {
                if (e.source === step.nodeId) {
                  return { ...e, animated: true };
                }
                return e;
              })
            );
          }

          // Update execution steps
          setExecution((curr) => {
            if (!curr) return null;
            const existingSteps = curr.steps || [];
            const updatedSteps = [...existingSteps.filter((s) => s.nodeId !== step.nodeId), step];
            return {
              ...curr,
              steps: updatedSteps,
            };
          });
        }
      );

      setExecution(execResult);
      if (execResult.status === 'succeeded') {
        showToast('success', `Workflow execution complete! ${(execResult.steps || []).length} steps executed.`);
      } else {
        showToast('error', `Execution failed: ${execResult.error || 'Module failure'}`);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Execution error.');
      setExecution((curr) =>
        curr
          ? {
              ...curr,
              status: 'failed',
              error: err?.message,
              finishedAt: new Date().toISOString(),
            }
          : null
      );
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, nodes, edges, workflow.id, setNodes, setEdges]);

  // Selected node object
  const selectedNode: WorkflowNode | null = useMemo(() => {
    if (!selectedNodeId) return null;
    const found = nodes.find((n) => n.id === selectedNodeId);
    if (!found) return null;
    return {
      id: found.id,
      type: found.type as NodeType,
      position: found.position,
      data: found.data as any,
    };
  }, [nodes, selectedNodeId]);

  const selectedStepResult: ExecutionStepResult | null = useMemo(() => {
    if (!selectedNodeId || !execution) return null;
    return (execution.steps || []).find((s) => s.nodeId === selectedNodeId) || null;
  }, [selectedNodeId, execution]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#292b30] text-slate-100 overflow-hidden font-sans select-none">
      {/* Tactile Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-[6px_6px_16px_rgba(0,0,0,0.5),-6px_-6px_16px_rgba(255,255,255,0.08)] bg-[#292b30] border border-white/[0.04] text-xs font-mono font-medium animate-in fade-in slide-in-from-top-4 duration-200`}
        >
          <StatusLED
            status={toast.type === 'success' ? 'success' : toast.type === 'error' ? 'failed' : 'cyan'}
            size="sm"
          />
          <span className="max-w-md text-slate-200">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white ml-2 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <Header
        workflowTitle={workflowTitle}
        onTitleChange={(title) => {
          setWorkflowTitle(title);
          setIsDirty(true);
        }}
        revision={revision}
        isDirty={isDirty}
        isRunning={isRunning}
        isSaving={isSaving}
        saveStatus={saveStatus}
        onSave={handleSaveWorkflow}
        collaborators={INITIAL_COLLABORATORS}
        onRun={handleRun}
        onResetSample={handleResetSample}
        onValidate={handleValidate}
        onClear={handleClear}
        currentView={currentView}
        onViewChange={onViewChange}
        projectName={activeProjectName}
        onCreateProjectClick={onCreateProjectClick}
      />

      {/* View 1: Studio Canvas & Workflow Builder */}
      {currentView === 'studio' && (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Module Palette */}
          <NodePalette onAddNode={handleAddNode} />

          {/* Center Recessed Canvas Space */}
          <main className="flex-1 h-full relative">
            <ReactFlowProvider>
              <WorkflowCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={handleConnect}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                onDropNode={handleDropNode}
              />
            </ReactFlowProvider>
          </main>

          {/* Bottom Execution Telemetry Drawer */}
          <ExecutionConsole
            execution={execution}
            isRunning={isRunning}
            onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
          />

          {/* Right Inspector Panel */}
          <InspectorPanel
            selectedNode={selectedNode}
            selectedStepResult={selectedStepResult}
            onUpdateNodeData={handleUpdateNodeData}
            onDeleteNode={handleDeleteNode}
            totalNodes={nodes.length}
            totalEdges={edges.length}
            availableIntegrations={availableIntegrations}
          />
        </div>
      )}

      {/* View 2: Projects Dashboard */}
      {currentView === 'projects' && (
        <ProjectsView
          activeProjectId={activeProjectId}
          onSelectProject={(id, name) => {
            onSelectProject?.(id, name);
            onViewChange?.('studio');
          }}
          onOpenIntegrations={() => onViewChange?.('integrations')}
        />
      )}

      {/* View 3: External App Integrations Hub (CivicConnect) */}
      {currentView === 'integrations' && (
        <IntegrationsView
          currentWorkflowId={workflow.id}
          onOpenStudio={() => onViewChange?.('studio')}
        />
      )}

      {/* Revision Conflict Resolution Modal */}
      <ConflictModal
        isOpen={conflictWorkflow !== null}
        serverWorkflow={conflictWorkflow}
        localRevision={revision}
        onAcceptServer={handleAcceptServerConflict}
        onForceOverwrite={handleForceOverwriteConflict}
      />
    </div>
  );
};

export default Studio;
