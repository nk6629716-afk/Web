import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  toWorkflowGraphDTO,
  isUuid,
  SEEDED_SAMPLE_WORKFLOW,
} from '@relay/shared';
import { io, Socket } from 'socket.io-client';
import { SAMPLE_WORKFLOW } from '../lib/sampleWorkflow';
import { executeWorkflow, validateGraph } from '../lib/localEngine';
import { api, getSocketBaseUrl } from '../lib/api';
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

export interface StudioProps {
  currentView?: AppView;
  onViewChange?: (view: AppView) => void;
  activeProjectId?: string;
  activeProjectName?: string;
  onSelectProject?: (projectId: string, projectName: string) => void;
  onCreateProjectClick?: () => void;
  userId?: string;
  userEmail?: string | null;
  userDisplayName?: string | null;
  isDemoMode?: boolean;
  onLogout?: () => void;
}

export const Studio: React.FC<StudioProps> = ({
  currentView = 'studio',
  onViewChange,
  activeProjectId = '123fd611-4dd1-494f-99b2-ae2dbc748a47',
  activeProjectName = 'Default Workspace',
  onSelectProject,
  onCreateProjectClick,
  userId,
  userEmail,
  userDisplayName,
  isDemoMode = false,
  onLogout,
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

  // Real-time multi-user collaboration state & refs
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
  const isRemoteUpdateRef = useRef<boolean>(false);
  const currentUserIdRef = useRef<string>(userId || `user-${Math.random().toString(36).substring(2, 7)}`);
  const broadcastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userId) {
      currentUserIdRef.current = userId;
    }
  }, [userId]);

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

  // Socket.IO lifecycle & Real-Time Presence & Broadcast
  useEffect(() => {
    const socketUrl = getSocketBaseUrl();
    const socket: Socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsRealtimeConnected(true);
      if (workflow.id) {
        socket.emit('room:join', {
          workflowId: workflow.id,
          user: {
            id: currentUserIdRef.current,
            name: userDisplayName || (isDemoMode ? 'Offline Guest' : userEmail ? userEmail.split('@')[0] : 'Collaborator'),
            displayName: userDisplayName || undefined,
            email: userEmail || undefined,
          },
        });
      }
    });

    socket.on('disconnect', () => {
      setIsRealtimeConnected(false);
    });

    socket.on('presence:update', (payload: { collaborators: Collaborator[] }) => {
      // Exclude own user session so collaborators represents actual OTHER peers in this workflow
      const others = (payload.collaborators || []).filter(
        (c) => c.id !== currentUserIdRef.current && c.userId !== currentUserIdRef.current && c.id !== socket.id
      );
      setCollaborators(others);
    });

    socket.on('workflow:updated', (payload: { workflow: Workflow; updatedBy?: string }) => {
      if (!payload.workflow || payload.workflow.id !== workflow.id) return;

      // If local uncommitted dirty edits exist, do not overwrite silently: trigger conflict
      if (isDirty) {
        setConflictWorkflow(payload.workflow);
        showToast('error', `Conflict: ${payload.updatedBy || 'A collaborator'} saved revision #${payload.workflow.revision}. Please review.`);
        return;
      }

      // Smoothly adopt accepted remote change
      isRemoteUpdateRef.current = true;
      setWorkflow(payload.workflow);
      setWorkflowTitle(payload.workflow.name);
      setRevision(payload.workflow.revision);

      setNodes(
        (payload.workflow.graph?.nodes || []).map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        }))
      );

      setEdges(
        (payload.workflow.graph?.edges || []).map((e) => ({
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
      setSaveStatus('saved');
      showToast('info', `${payload.updatedBy || 'A collaborator'} updated workflow (rev #${payload.workflow.revision}).`);
      setTimeout(() => {
        isRemoteUpdateRef.current = false;
        setSaveStatus('idle');
      }, 500);
    });

    socket.on('workflow:sync', (payload: { workflow: Workflow }) => {
      if (payload.workflow && payload.workflow.id === workflow.id) {
        setWorkflow(payload.workflow);
        setRevision(payload.workflow.revision);
        setWorkflowTitle(payload.workflow.name);
        setIsDirty(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      }
    });

    socket.on('error', (payload: any) => {
      if (payload.code === 'STALE_REVISION' && payload.canonicalWorkflow) {
        setConflictWorkflow(payload.canonicalWorkflow);
        showToast('error', 'Stale update rejected: another collaborator updated this workflow.');
        setSaveStatus('failed');
      } else {
        console.warn('Realtime Socket error:', payload);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Synchronize room membership whenever active workflow changes
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected && workflow.id) {
      socketRef.current.emit('room:join', {
        workflowId: workflow.id,
        user: {
          id: currentUserIdRef.current,
          name: userDisplayName || (isDemoMode ? 'Offline Guest' : userEmail ? userEmail.split('@')[0] : 'Collaborator'),
          displayName: userDisplayName || undefined,
          email: userEmail || undefined,
        },
      });
    }
  }, [workflow.id, userDisplayName, userEmail, isDemoMode]);

  // Synchronize selection presence to peers
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected && workflow.id) {
      socketRef.current.emit('presence:select', {
        workflowId: workflow.id,
        userId: currentUserIdRef.current,
        nodeId: selectedNodeId || undefined,
      });
    }
  }, [selectedNodeId, workflow.id]);

  // Synchronize active editing status to peers
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected && workflow.id) {
      socketRef.current.emit('presence:status', {
        workflowId: workflow.id,
        status: isSaving ? 'saving' : isDirty ? 'editing' : 'viewing',
      });
    }
  }, [isSaving, isDirty, workflow.id]);

  // PRIORITY 1: Reliable workflow initialization & recovery
  const loadWorkflow = useCallback(
    async (targetId?: string) => {
      setIsLoadingWorkflow(true);
      try {
        let wf: Workflow | null = null;
        let isRealDbWorkflow = false;

        // 1. If a valid workflowId exists in targetId or URL, load that workflow
        let candidateId = targetId;
        if (!candidateId && typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const fromUrl = urlParams.get('workflowId');
          if (fromUrl && isUuid(fromUrl)) {
            candidateId = fromUrl;
          }
        }

        if (candidateId && isUuid(candidateId)) {
          try {
            const res = await api.getWorkflow(candidateId);
            if (res && res.workflow && isUuid(res.workflow.id)) {
              wf = res.workflow;
              isRealDbWorkflow = true;
            }
          } catch (err: any) {
            console.warn(`Workflow ${candidateId} could not be loaded, recovering:`, err?.message);
          }
        }

        // 2. Otherwise, restore the last valid workflow ID if it belongs to the active project
        if (!wf && typeof window !== 'undefined') {
          const storedId = localStorage.getItem('relay:active_workflow_id');
          if (storedId && isUuid(storedId)) {
            try {
              const res = await api.getWorkflow(storedId);
              if (res && res.workflow && isUuid(res.workflow.id)) {
                if (!activeProjectId || !isUuid(activeProjectId) || res.workflow.projectId === activeProjectId) {
                  wf = res.workflow;
                  isRealDbWorkflow = true;
                }
              }
            } catch {
              localStorage.removeItem('relay:active_workflow_id');
            }
          }
        }

        // 3. If no valid saved workflow loaded, query active project workflows
        if (!wf) {
          try {
            const list = await api.getWorkflows(activeProjectId);
            if (list && list.length > 0) {
              const validWf = list.find((item) => isUuid(item.id)) || list[0];
              if (validWf) {
                wf = validWf;
                isRealDbWorkflow = isUuid(validWf.id);
              }
            }
          } catch (err: any) {
            console.warn('Could not list workflows for active project:', err?.message);
          }
        }

        // 4. If active project has no workflows, initialize default demo workflow in Supabase with a real UUID
        if (!wf) {
          try {
            const created = await api.createWorkflow({
              name: SEEDED_SAMPLE_WORKFLOW.name,
              projectId: activeProjectId,
              graph: SEEDED_SAMPLE_WORKFLOW.graph,
            });
            if (created && isUuid(created.id)) {
              wf = created;
              isRealDbWorkflow = true;
            }
          } catch (createErr: any) {
            console.warn('Could not initialize default workflow in database (offline fallback):', createErr?.message);
            // 5. Offline demo fallback only when backend/database is unreachable
            wf = {
              ...SEEDED_SAMPLE_WORKFLOW,
              id: 'demo-offline',
            };
            isRealDbWorkflow = false;
          }
        }

        if (wf) {
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
          setSaveStatus(isRealDbWorkflow ? 'saved' : 'idle');
          setConflictWorkflow(null);

          // 7. Keep React state, URL parameters, local storage consistent
          if (typeof window !== 'undefined') {
            if (isRealDbWorkflow && isUuid(wf.id)) {
              localStorage.setItem('relay:active_workflow_id', wf.id);
              const currentUrl = new URL(window.location.href);
              if (currentUrl.searchParams.get('workflowId') !== wf.id) {
                currentUrl.searchParams.set('workflowId', wf.id);
                window.history.replaceState(null, '', currentUrl.toString());
              }
            } else {
              localStorage.removeItem('relay:active_workflow_id');
              const currentUrl = new URL(window.location.href);
              if (currentUrl.searchParams.has('workflowId')) {
                currentUrl.searchParams.delete('workflowId');
                window.history.replaceState(null, '', currentUrl.toString());
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Workflow initialization failed:', err);
      } finally {
        setIsLoadingWorkflow(false);
      }
    },
    [activeProjectId, setNodes, setEdges]
  );

  useEffect(() => {
    loadWorkflow();
  }, [activeProjectId]);

  // Debounced broadcast helper for canvas changes
  const scheduleBroadcastGraph = useCallback(
    (customNodes?: Node[], customEdges?: Edge[]) => {
      if (isRemoteUpdateRef.current) return;
      if (!socketRef.current || !socketRef.current.connected) return;
      if (!workflow.id || !isUuid(workflow.id)) return;

      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
      }

      broadcastTimeoutRef.current = setTimeout(() => {
        const targetNodes = customNodes || nodes;
        const targetEdges = customEdges || edges;
        const currentGraph = toWorkflowGraphDTO(targetNodes, targetEdges);
        socketRef.current?.emit('workflow:update', {
          workflowId: workflow.id,
          expectedRevision: revision,
          graph: currentGraph,
          name: workflowTitle,
          updatedBy: userDisplayName || (userEmail ? userEmail.split('@')[0] : 'Collaborator'),
        });
      }, 500);
    },
    [workflow.id, revision, nodes, edges, workflowTitle, userDisplayName, userEmail]
  );

  // Create new workflow action
  const handleCreateWorkflow = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const created = await api.createWorkflow({
        name: `Workflow ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        projectId: activeProjectId,
        graph: {
          nodes: [
            {
              id: 'node-trigger-1',
              type: 'trigger',
              position: { x: 120, y: 220 },
              data: { label: 'Start Trigger', nodeType: 'trigger', config: {} }
            }
          ],
          edges: []
        }
      });

      if (created) {
        setWorkflow(created);
        setWorkflowTitle(created.name);
        setRevision(created.revision);
        setNodes(
          (created.graph?.nodes || []).map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          }))
        );
        setEdges([]);
        setIsDirty(false);
        setSaveStatus('idle');

        if (typeof window !== 'undefined') {
          localStorage.setItem('relay:active_workflow_id', created.id);
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('workflowId', created.id);
          window.history.replaceState(null, '', currentUrl.toString());
        }

        showToast('success', `Created new workflow "${created.name}"!`);
      }
    } catch (err: any) {
      showToast('error', `Failed to create workflow: ${err.message || 'Server error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [activeProjectId, isSaving, setNodes, setEdges]);

  // Save workflow action with optimistic locking & revision verification
  const handleSaveWorkflow = useCallback(
    async (forcedRevision?: number) => {
      if (isSaving) return;

      const currentGraph = toWorkflowGraphDTO(nodes, edges);

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
        let savedWf: Workflow;

        // If workflow is new or ID is not a valid UUID, create it first on backend
        if (!isUuid(workflow.id)) {
          savedWf = await api.createWorkflow({
            name: workflowTitle,
            projectId: activeProjectId,
            graph: currentGraph,
          });
        } else {
          try {
            const res = await api.saveWorkflow(
              workflow.id,
              currentGraph,
              workflowTitle,
              targetRevision,
              activeProjectId
            );
            savedWf = res.workflow;
          } catch (saveErr: any) {
            // If the record was not found in Supabase (404), create it and retain the new UUID
            if (saveErr.status === 404 || saveErr.code === 'WORKFLOW_NOT_FOUND') {
              savedWf = await api.createWorkflow({
                name: workflowTitle,
                projectId: activeProjectId,
                graph: currentGraph,
              });
            } else {
              throw saveErr;
            }
          }
        }

        if (savedWf) {
          setWorkflow(savedWf);
          setRevision(savedWf.revision);
          setWorkflowTitle(savedWf.name);
          setIsDirty(false);
          setSaveStatus('saved');
          setConflictWorkflow(null);

          // Persist active workflow ID to localStorage and synchronize URL query param
          if (typeof window !== 'undefined') {
            localStorage.setItem('relay:active_workflow_id', savedWf.id);
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('workflowId', savedWf.id);
            window.history.replaceState(null, '', currentUrl.toString());
          }

          // Broadcast saved update to Socket.IO room so active peers receive it
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('workflow:update', {
              workflowId: savedWf.id,
              expectedRevision: targetRevision,
              graph: currentGraph,
              name: workflowTitle,
              updatedBy: userDisplayName || (userEmail ? userEmail.split('@')[0] : 'Collaborator'),
            });
          }

          showToast('success', `Workflow "${savedWf.name}" saved (rev #${savedWf.revision})!`);
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
    [isSaving, nodes, edges, revision, workflow.id, workflowTitle, activeProjectId, userDisplayName, userEmail]
  );

  // Global keyboard shortcut: Ctrl+S / Cmd+S to save workflow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveWorkflow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveWorkflow]);

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

  // Track node / edge changes to dirty state and broadcast
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      const isDragStop = changes.some((c: any) => c.type === 'position' && c.dragging === false);
      const isRemoval = changes.some((c: any) => c.type === 'remove');
      if (isDragStop || isRemoval) {
        setIsDirty(true);
        scheduleBroadcastGraph();
      }
    },
    [onNodesChange, scheduleBroadcastGraph]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      if (changes.some((c: any) => c.type === 'remove')) {
        setIsDirty(true);
        scheduleBroadcastGraph();
      }
    },
    [onEdgesChange, scheduleBroadcastGraph]
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

      setEdges((eds) => {
        const nextEds = addEdge(newEdge, eds);
        scheduleBroadcastGraph(nodes, nextEds);
        return nextEds;
      });
    },
    [setEdges, nodes, scheduleBroadcastGraph]
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

      setNodes((nds) => {
        const nextNds = [...nds, newNode];
        scheduleBroadcastGraph(nextNds, edges);
        return nextNds;
      });
      setSelectedNodeId(newNodeId);
      showToast('info', `Added new ${type} module to canvas.`);
    },
    [setNodes, edges, scheduleBroadcastGraph]
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

      setNodes((nds) => {
        const nextNds = [...nds, newNode];
        scheduleBroadcastGraph(nextNds, edges);
        return nextNds;
      });
      setSelectedNodeId(newNodeId);
    },
    [setNodes, edges, scheduleBroadcastGraph]
  );

  // Update node data (label or config)
  const handleUpdateNodeData = useCallback(
    (nodeId: string, updatedData: Partial<WorkflowNode['data']>) => {
      setIsDirty(true);
      setNodes((nds) => {
        const nextNds = nds.map((n) => {
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
        });
        scheduleBroadcastGraph(nextNds, edges);
        return nextNds;
      });
    },
    [setNodes, edges, scheduleBroadcastGraph]
  );

  // Delete node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setIsDirty(true);
      setNodes((nds) => {
        const nextNds = nds.filter((n) => n.id !== nodeId);
        const nextEds = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
        scheduleBroadcastGraph(nextNds, nextEds);
        return nextNds;
      });
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      showToast('info', `Deleted module "${nodeId}".`);
    },
    [selectedNodeId, setNodes, setEdges, edges, scheduleBroadcastGraph]
  );

  // Validate graph action
  const handleValidate = useCallback(() => {
    const currentGraph = toWorkflowGraphDTO(nodes, edges);

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
    setWorkflow(SAMPLE_WORKFLOW);
    setWorkflowTitle(SAMPLE_WORKFLOW.name);
    setRevision(1);
    setIsDirty(true);
    setExecution(null);
    setSelectedNodeId('node-transform-1');
    showToast('info', 'Loaded demo workflow template. Click Save Workflow to persist.');
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

    const currentGraph = toWorkflowGraphDTO(nodes, edges);

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
        collaborators={collaborators}
        isRealtimeConnected={isRealtimeConnected}
        onSave={handleSaveWorkflow}
        onRun={handleRun}
        onResetSample={handleResetSample}
        onValidate={handleValidate}
        onClear={handleClear}
        currentView={currentView}
        onViewChange={onViewChange}
        projectName={activeProjectName}
        onCreateProjectClick={onCreateProjectClick}
        onCreateWorkflowClick={handleCreateWorkflow}
        userEmail={userEmail}
        userDisplayName={userDisplayName}
        isDemoMode={isDemoMode}
        onLogout={onLogout}
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
          activeProjectId={activeProjectId}
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
