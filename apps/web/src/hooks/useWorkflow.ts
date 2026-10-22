import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Workflow, 
  RelayNode, 
  RelayEdge, 
  NodeType, 
  Collaborator, 
  ExecutionStep,
  SEEDED_SAMPLE_WORKFLOW 
} from '@relay/shared';
import { 
  applyNodeChanges, 
  applyEdgeChanges, 
  addEdge, 
  Connection, 
  EdgeChange, 
  NodeChange 
} from '@xyflow/react';

export function useWorkflow(workflowId: string = SEEDED_SAMPLE_WORKFLOW.id) {
  const [workflow, setWorkflow] = useState<Workflow>(SEEDED_SAMPLE_WORKFLOW);
  const [nodes, setNodes] = useState<RelayNode[]>(SEEDED_SAMPLE_WORKFLOW.graph.nodes);
  const [edges, setEdges] = useState<RelayEdge[]>(SEEDED_SAMPLE_WORKFLOW.graph.edges);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'succeeded' | 'failed'>('idle');
  const [executionDuration, setExecutionDuration] = useState<number | undefined>(undefined);
  const [executionError, setExecutionError] = useState<string | undefined>(undefined);

  const [conflictWorkflow, setConflictWorkflow] = useState<Workflow | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const userRef = useRef({
    id: `guest-${Math.random().toString(36).substring(2, 7)}`,
    name: `Peer ${Math.floor(Math.random() * 900) + 100}`
  });

  // Socket.IO Setup
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const socket: Socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('room:join', {
        workflowId,
        user: userRef.current
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('workflow:sync', (payload: { workflow: Workflow }) => {
      setWorkflow(payload.workflow);
      setNodes(payload.workflow.graph.nodes);
      setEdges(payload.workflow.graph.edges);
      setHasUnsavedChanges(false);
      setConflictWorkflow(null);
    });

    socket.on('workflow:updated', (payload: { workflow: Workflow; updatedBy: string }) => {
      setWorkflow(payload.workflow);
      setNodes(payload.workflow.graph.nodes);
      setEdges(payload.workflow.graph.edges);
      setHasUnsavedChanges(false);
    });

    socket.on('presence:update', (payload: { collaborators: Collaborator[] }) => {
      setCollaborators(payload.collaborators.filter(c => c.id !== userRef.current.id));
    });

    socket.on('execution:event', (payload: { step: ExecutionStep }) => {
      const step = payload.step;
      setExecutionSteps(prev => {
        const existingIdx = prev.findIndex(s => s.nodeId === step.nodeId);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = step;
          return next;
        }
        return [...prev, step];
      });

      // Update node visual status on canvas
      setNodes(prev => prev.map(n => {
        if (n.id === step.nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              status: step.status,
              lastRun: {
                input: step.input,
                output: step.output,
                durationMs: step.durationMs,
                error: step.errorMessage
              }
            }
          };
        }
        return n;
      }));
    });

    socket.on('execution:complete', (payload: any) => {
      setIsRunning(false);
      setExecutionStatus(payload.status);
      setExecutionDuration(payload.durationMs);
      setExecutionError(payload.error);
    });

    socket.on('error', (payload: any) => {
      if (payload.code === 'STALE_REVISION' && payload.canonicalWorkflow) {
        setConflictWorkflow(payload.canonicalWorkflow);
      } else {
        console.error('Socket error:', payload);
      }
      setIsSaving(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [workflowId]);

  // Node Changes handler
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes(nds => applyNodeChanges(changes, nds as any) as any);
    setHasUnsavedChanges(true);
  }, []);

  // Edge Changes handler
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges(eds => applyEdgeChanges(changes, eds as any) as any);
    setHasUnsavedChanges(true);
  }, []);

  // Connect Handler
  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({
      ...params,
      id: `edge-${Date.now()}`,
      animated: false
    }, eds));
    setHasUnsavedChanges(true);
  }, []);

  // Add Node
  const addNode = useCallback((type: NodeType) => {
    const id = `node-${type}-${Date.now().toString(36)}`;
    const newNode: RelayNode = {
      id,
      type,
      position: { x: 400 + Math.random() * 60, y: 200 + Math.random() * 60 },
      data: {
        label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type,
        config: type === 'trigger' ? { initialPayload: { message: "Hello" } }
              : type === 'transform' ? { operation: 'trim' }
              : type === 'condition' ? { operator: 'equals', targetValue: 'true' }
              : { destination: 'response' },
        status: 'idle'
      }
    };

    setNodes(nds => [...nds, newNode]);
    setSelectedNodeId(id);
    setHasUnsavedChanges(true);
  }, []);

  // Update Node Data
  const updateNodeData = useCallback((nodeId: string, updates: Partial<RelayNode['data']>) => {
    setNodes(nds => nds.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            ...updates
          }
        };
      }
      return n;
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Delete Node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    setHasUnsavedChanges(true);
  }, [selectedNodeId]);

  // Save Workflow
  const saveWorkflow = useCallback((forceNextRevision?: number) => {
    if (!socketRef.current) return;
    setIsSaving(true);

    const updatedGraph = {
      nodes,
      edges
    };

    const targetRevision = forceNextRevision !== undefined ? forceNextRevision : workflow.revision;

    socketRef.current.emit('workflow:update', {
      workflowId,
      expectedRevision: targetRevision,
      graph: updatedGraph,
      updatedBy: userRef.current.name
    });

    setIsSaving(false);
  }, [workflowId, nodes, edges, workflow.revision]);

  // Run Workflow
  const runWorkflowCTA = useCallback(() => {
    if (!socketRef.current || isRunning) return;

    // Reset node execution statuses to idle
    setNodes(prev => prev.map(n => ({
      ...n,
      data: {
        ...n.data,
        status: 'idle',
        lastRun: undefined
      }
    })));

    setExecutionSteps([]);
    setExecutionStatus('running');
    setExecutionDuration(undefined);
    setExecutionError(undefined);
    setIsRunning(true);

    socketRef.current.emit('execution:start', {
      workflowId,
      triggerInput: {}
    });
  }, [workflowId, isRunning]);

  return {
    workflow,
    nodes,
    edges,
    collaborators,
    selectedNodeId,
    selectedNode: nodes.find(n => n.id === selectedNodeId) || null,
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
    clearExecutionConsole: () => {
      setExecutionSteps([]);
      setExecutionStatus('idle');
      setExecutionDuration(undefined);
      setExecutionError(undefined);
    },
    acceptServerConflict: () => {
      if (conflictWorkflow) {
        setWorkflow(conflictWorkflow);
        setNodes(conflictWorkflow.graph.nodes);
        setEdges(conflictWorkflow.graph.edges);
        setConflictWorkflow(null);
        setHasUnsavedChanges(false);
      }
    },
    forceOverwriteConflict: () => {
      if (conflictWorkflow) {
        saveWorkflow(conflictWorkflow.revision);
        setConflictWorkflow(null);
      }
    }
  };
}
