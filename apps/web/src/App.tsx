import React, { useState, useCallback, useMemo } from 'react';
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
} from '@relay/shared';
import { SAMPLE_WORKFLOW } from './lib/sampleWorkflow';
import { executeWorkflow, validateGraph } from './lib/localEngine';
import { TopNav } from './components/TopNav';
import { NodePalette } from './components/NodePalette';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { InspectorPanel } from './components/InspectorPanel';
import { ExecutionConsole } from './components/ExecutionConsole';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const INITIAL_COLLABORATORS: Collaborator[] = [
  {
    userId: 'u_1',
    displayName: 'Alex M.',
    color: '#3b82f6',
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
    color: '#10b981',
    lastActive: new Date().toISOString(),
  },
];

export const App: React.FC = () => {
  const [workflow, setWorkflow] = useState<Workflow>(SAMPLE_WORKFLOW);
  const [workflowTitle, setWorkflowTitle] = useState(SAMPLE_WORKFLOW.name);
  const [revision, setRevision] = useState(SAMPLE_WORKFLOW.revision);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-transform-1');
  const [isRunning, setIsRunning] = useState(false);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(
    null
  );

  // Initialize React Flow nodes & edges from workflow
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
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label: e.label,
    }));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  };

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
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        label,
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Default configuration per node type
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
      showToast('info', `Added new ${type} node to canvas.`);
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
      showToast('info', `Deleted node "${nodeId}".`);
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
      showToast('success', 'Workflow graph structure is valid! Ready for execution.');
    } else {
      showToast('error', `Validation failed: ${result.errors.join('; ')}`);
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
    showToast('info', 'Reset to seeded sample onboarding workflow.');
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
          // Real-time step callback: update corresponding node visual status
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

          // Update execution steps accumulator
          setExecution((curr) => {
            if (!curr) return null;
            const updatedSteps = [...curr.steps.filter((s) => s.nodeId !== step.nodeId), step];
            return {
              ...curr,
              steps: updatedSteps,
            };
          });
        }
      );

      setExecution(execResult);
      if (execResult.status === 'succeeded') {
        showToast('success', `Execution succeeded! Completed ${execResult.steps.length} steps.`);
      } else {
        showToast('error', `Execution stopped: ${execResult.error || 'Node failure'}`);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Execution failed.');
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

  // Step result for selected node
  const selectedStepResult: ExecutionStepResult | null = useMemo(() => {
    if (!selectedNodeId || !execution) return null;
    return execution.steps.find((s) => s.nodeId === selectedNodeId) || null;
  }, [selectedNodeId, execution]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0d14] text-slate-100 overflow-hidden font-sans">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-16 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border text-xs font-medium animate-in fade-in slide-in-from-top-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-emerald-500/20'
              : toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-rose-500/20'
              : 'bg-slate-900/90 text-slate-200 border-white/20 shadow-black/40'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="max-w-md">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="p-1 hover:bg-white/10 rounded ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Bar */}
      <TopNav
        workflowTitle={workflowTitle}
        onTitleChange={(title) => {
          setWorkflowTitle(title);
          setIsDirty(true);
        }}
        revision={revision}
        isDirty={isDirty}
        isRunning={isRunning}
        collaborators={INITIAL_COLLABORATORS}
        onRun={handleRun}
        onResetSample={handleResetSample}
        onValidate={handleValidate}
        onClear={handleClear}
      />

      {/* Main Studio Work Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Palette */}
        <NodePalette onAddNode={handleAddNode} />

        {/* Center Canvas */}
        <main className="flex-1 h-full relative">
          <ReactFlowProvider>
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              onDropNode={handleDropNode}
            />
          </ReactFlowProvider>
        </main>

        {/* Bottom Execution Console */}
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
        />
      </div>
    </div>
  );
};

export default App;
