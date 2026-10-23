import React, { useState, useEffect } from 'react';
import {
  Code,
  Copy,
  Check,
  Play,
  CheckCircle2,
  AlertTriangle,
  Server,
  ShieldCheck,
  FileCode,
  Terminal,
  Zap,
  Layers,
  ArrowRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Plus,
  Trash2,
  Globe,
  KeyRound,
  CheckCircle,
  XCircle,
  Activity,
  Radio
} from 'lucide-react';
import { Workflow, AppIntegrationSafeResponse, TestConnectionResult } from '@relay/shared';
import { api, getApiBaseUrl, ExecutionResponse } from '../lib/api';
import { NeumoButton } from './ui/NeumoButton';
import { NeumoCard } from './ui/NeumoCard';
import { StatusLED } from './ui/StatusLED';
import { ConnectAppModal } from './ConnectAppModal';

interface IntegrationsViewProps {
  currentWorkflowId?: string;
  activeProjectId?: string;
  onOpenStudio?: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  currentWorkflowId = 'demo-workflow-001',
  activeProjectId,
  onOpenStudio,
}) => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(currentWorkflowId);
  const [resolvedProjectId, setResolvedProjectId] = useState<string>(activeProjectId || 'demo-project-001');
  const [activeTab, setActiveTab] = useState<'curl' | 'javascript' | 'nodejs' | 'python' | 'civicconnect'>('civicconnect');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Integrations state
  const [integrations, setIntegrations] = useState<AppIntegrationSafeResponse[]>([]);
  const [isIntegrationsLoading, setIsIntegrationsLoading] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [testingIntegrationId, setTestingIntegrationId] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<Record<string, TestConnectionResult>>({});

  // Health and test states
  const [healthStatus, setHealthStatus] = useState<{ status: string; uptimeSeconds: number } | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        orderId: 'CIVIC-2026-904',
        amount: 14500,
        customer: '  MARIA GONZALEZ  ',
        reason: 'Pothole road hazard reported'
      },
      null,
      2
    )
  );
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<ExecutionResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testDurationMs, setTestDurationMs] = useState<number | null>(null);

  const baseUrl = getApiBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : 'https://relay-api-bo0p.onrender.com');
  const executionEndpoint = `${baseUrl}/api/workflows/${selectedWorkflowId}/execute`;

  // Fetch Integrations list
  const fetchIntegrations = async (targetProjectId?: string) => {
    setIsIntegrationsLoading(true);
    const pid = targetProjectId || resolvedProjectId;
    try {
      const list = await api.getIntegrations(pid);
      setIntegrations(list);
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setIsIntegrationsLoading(false);
    }
  };

  const fetchHealth = async () => {
    setIsHealthLoading(true);
    try {
      const h = await api.getHealth();
      setHealthStatus(h);
    } catch {
      setHealthStatus(null);
    } finally {
      setIsHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    // Resolve active project ID from API if default is a placeholder
    const initProject = async () => {
      try {
        const projects = await api.getProjects();
        if (projects && projects.length > 0) {
          const match = activeProjectId ? projects.find(p => p.id === activeProjectId) : projects[0];
          const chosenId = match ? match.id : projects[0].id;
          setResolvedProjectId(chosenId);
          fetchIntegrations(chosenId);
          return;
        }
      } catch {
        // Fallback to activeProjectId
      }
      fetchIntegrations(resolvedProjectId);
    };

    initProject();
  }, [activeProjectId]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  // Test individual saved integration
  const handleTestIntegration = async (id: string) => {
    setTestingIntegrationId(id);
    try {
      const res = await api.testIntegration(id);
      setTestFeedback((prev) => ({ ...prev, [id]: res }));
      // Refresh list to show updated lastTestedAt and lastTestStatus
      await fetchIntegrations();
    } catch (err: any) {
      setTestFeedback((prev) => ({
        ...prev,
        [id]: {
          success: false,
          durationMs: 0,
          message: err.message || 'Connection failed'
        }
      }));
    } finally {
      setTestingIntegrationId(null);
    }
  };

  // Delete integration
  const handleDeleteIntegration = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect integration "${name}"?`)) return;
    try {
      await api.deleteIntegration(id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      alert(`Failed to delete integration: ${err.message}`);
    }
  };

  const handleRunTest = async () => {
    let parsedInput = {};
    try {
      parsedInput = JSON.parse(testPayload);
    } catch {
      setTestError('Invalid JSON in test payload.');
      return;
    }

    setTestLoading(true);
    setTestError(null);
    setTestResult(null);
    const start = performance.now();

    try {
      const res = await api.executeWorkflow(selectedWorkflowId, parsedInput);
      const elapsed = Math.round(performance.now() - start);
      setTestDurationMs(elapsed);
      setTestResult(res);
    } catch (err: any) {
      setTestError(err.message || 'Execution request failed.');
    } finally {
      setTestLoading(false);
    }
  };

  // Code generator snippets
  const snippets = {
    curl: `curl -X POST "${executionEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '${testPayload.replace(/'/g, "'\\''")}'`,

    javascript: `// Frontend or Node.js fetch
async function executeRelayWorkflow(inputData) {
  const response = await fetch("${executionEndpoint}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: inputData
    })
  });

  if (!response.ok) {
    throw new Error(\`Relay execution failed: \${response.statusText}\`);
  }

  const { execution, summary } = await response.json();
  console.log("Execution ID:", execution.id);
  console.log("Status:", summary.status);
  return { execution, summary };
}`,

    nodejs: `import express from 'express';

const app = express();
app.use(express.json());

const RELAY_ENDPOINT = "${executionEndpoint}";

app.post('/api/external-action', async (req, res) => {
  try {
    const response = await fetch(RELAY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: req.body })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`,

    python: `import requests

RELAY_ENDPOINT = "${executionEndpoint}"

payload = {
    "input": ${testPayload}
}

response = requests.post(
    RELAY_ENDPOINT,
    json=payload,
    headers={"Content-Type": "application/json"},
    timeout=10
)

data = response.json()
print("Execution Status:", data["summary"]["status"])
print("Step Outputs:", data["summary"]["steps"])`,

    civicconnect: `/**
 * CIVICCONNECT & CITYPULSE — Resilient Inbound & Outbound Integration
 * 
 * Inbound Flow:
 * 1. Citizen submits issue to CityPulse / CivicConnect.
 * 2. CityPulse dispatches incident payload to Relay endpoint:
 *    POST /api/v1/workflows/:id/runs (or /api/workflows/:id/execute)
 * 3. Relay evaluates conditions and routes issue to appropriate civic action.
 * 4. Configured external integration dispatches update back to municipal gateway.
 */

import { Router } from 'express';
const router = Router();

const RELAY_WORKFLOW_URL = "${executionEndpoint}";

router.post('/api/reports', async (req, res) => {
  // 1. Save citizen report to local database first (prevents data loss)
  const report = await civicDb.reports.create({
    citizenEmail: req.body.email,
    category: req.body.category || 'Road Hazard',
    details: req.body.details,
    status: 'pending_relay_dispatch'
  });

  try {
    // 2. Invoke Relay workflow with report payload
    const relayResponse = await fetch(RELAY_WORKFLOW_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.RELAY_API_KEY 
      },
      body: JSON.stringify({
        input: {
          issueId: report.id,
          category: report.category,
          severity: req.body.severity || 'medium',
          ward: req.body.ward || '12',
          details: report.details
        }
      }),
      signal: AbortSignal.timeout(8000)
    });

    const { execution, summary } = await relayResponse.json();

    return res.status(201).json({
      success: true,
      reportId: report.id,
      relayExecutionId: execution.id,
      status: summary.status
    });
  } catch (err) {
    console.error('Relay deferred, queued for retry:', err);
    return res.status(202).json({
      success: true,
      reportId: report.id,
      status: 'queued_for_automation'
    });
  }
});`
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#292b30] p-8 text-slate-100 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header with "+ Connect App" button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.05]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black tracking-wide uppercase text-slate-100">
                Integrations Dashboard
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono border bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20">
                <StatusLED status="success" size="sm" />
                <span>ACTIVE CONNECTORS</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Connect CityPulse, municipal services, and generic HTTP endpoints with encrypted credentials
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Primary "+ Connect App" button */}
            <NeumoButton
              onClick={() => setIsConnectModalOpen(true)}
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4 text-[#00bfff]" />}
              className="font-bold tracking-wide shadow-[3px_3px_8px_rgba(0,0,0,0.5),-3px_-3px_8px_rgba(255,255,255,0.08)]"
            >
              + Connect App
            </NeumoButton>

            <NeumoButton
              onClick={() => {
                fetchHealth();
                fetchIntegrations();
              }}
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isHealthLoading || isIntegrationsLoading ? 'animate-spin' : ''}`} />}
              title="Refresh integrations"
            />
            {onOpenStudio && (
              <NeumoButton
                onClick={onOpenStudio}
                size="sm"
                icon={<Layers className="w-3.5 h-3.5 text-[#00bfff]" />}
              >
                Canvas Studio
              </NeumoButton>
            )}
          </div>
        </div>

        {/* Section 1: Connected Applications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00bfff]/20 text-[#00bfff] inline-flex items-center justify-center text-[11px]">1</span>
                Connected External Applications ({integrations.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Selectable from workflow Output & Action nodes
            </span>
          </div>

          {isIntegrationsLoading && (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#00bfff]" />
              <span className="text-xs font-mono">Loading connected applications...</span>
            </div>
          )}

          {!isIntegrationsLoading && integrations.length === 0 && (
            <NeumoCard variant="recess" className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#24262b] text-[#00bfff] mx-auto flex items-center justify-center shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]">
                <Globe className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-200">No External Apps Connected Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Connect CityPulse or your custom REST backend so Relay workflows can dispatch actions, POST notifications, and update external databases.
                </p>
              </div>
              <NeumoButton
                onClick={() => setIsConnectModalOpen(true)}
                variant="primary"
                size="md"
                icon={<Plus className="w-4 h-4 text-[#00bfff]" />}
                className="font-bold mx-auto"
              >
                + Connect CityPulse or Custom App
              </NeumoButton>
            </NeumoCard>
          )}

          {!isIntegrationsLoading && integrations.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {integrations.map((integ) => {
                const feedback = testFeedback[integ.id];
                const isTestingThis = testingIntegrationId === integ.id;
                const statusLed: any =
                  integ.lastTestStatus === 'succeeded'
                    ? 'success'
                    : integ.lastTestStatus === 'failed'
                    ? 'failed'
                    : 'idle';

                return (
                  <NeumoCard
                    key={integ.id}
                    variant="protrude-sm"
                    className="p-5 flex flex-col justify-between space-y-4 border border-white/[0.03]"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <StatusLED status={statusLed} size="sm" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-100">{integ.name}</h3>
                              {integ.appType === 'citypulse' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#00bfff]/20 text-[#00bfff] font-bold">
                                  CITYPULSE
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 truncate block max-w-xs">
                              {integ.baseUrl}
                            </span>
                          </div>
                        </div>

                        <NeumoButton
                          onClick={() => handleDeleteIntegration(integ.id, integ.name)}
                          size="sm"
                          variant="danger"
                          icon={<Trash2 className="w-3.5 h-3.5 text-[#ff3366]" />}
                          title="Disconnect Integration"
                        />
                      </div>

                      {/* Badges strip */}
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono pt-2 border-t border-white/[0.04]">
                        <span className="px-2 py-0.5 rounded bg-[#24262b] text-slate-300 font-bold border border-white/[0.03]">
                          {integ.httpMethod}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#24262b] text-[#ffaa00] border border-white/[0.03] flex items-center gap-1">
                          <KeyRound className="w-2.5 h-2.5" />
                          {integ.authType.toUpperCase()}
                        </span>
                        {integ.hasSecret && (
                          <span className="px-2 py-0.5 rounded bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            {integ.maskedSecret}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-[#24262b] text-slate-400">
                          {integ.timeoutMs}ms timeout
                        </span>
                        {integ.testEndpoint && (
                          <span className="px-2 py-0.5 rounded bg-[#24262b] text-slate-400">
                            Probe: {integ.testEndpoint}
                          </span>
                        )}
                      </div>

                      {/* Connection Test Status Plaque */}
                      <div className="mt-3 p-2.5 rounded-lg bg-[#24262b] border border-white/[0.02] text-[11px] font-mono">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Health Status:</span>
                          {integ.lastTestStatus ? (
                            <span
                              className={`font-bold ${
                                integ.lastTestStatus === 'succeeded' ? 'text-[#00ff88]' : 'text-[#ff5580]'
                              }`}
                            >
                              {integ.lastTestStatus.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-slate-500">Not Tested Yet</span>
                          )}
                        </div>
                        {integ.lastTestMessage && (
                          <div className="text-[10px] text-slate-400 mt-1 truncate">
                            {integ.lastTestMessage}
                          </div>
                        )}
                        {integ.lastTestedAt && (
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            Last checked: {new Date(integ.lastTestedAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>

                      {/* Immediate Test Feedback */}
                      {feedback && (
                        <div
                          className={`mt-2 p-2 rounded-lg text-[10px] font-mono flex items-center gap-2 border ${
                            feedback.success
                              ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20'
                              : 'bg-[#ff3366]/10 text-[#ff5580] border-[#ff3366]/20'
                          }`}
                        >
                          <StatusLED status={feedback.success ? 'success' : 'failed'} size="sm" />
                          <span>
                            {feedback.message} ({feedback.durationMs}ms)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 flex items-center justify-between border-t border-white/[0.04]">
                      <span className="text-[10px] font-mono text-slate-400">
                        ID: <span className="text-slate-300">{integ.id}</span>
                      </span>
                      <NeumoButton
                        onClick={() => handleTestIntegration(integ.id)}
                        disabled={isTestingThis}
                        size="sm"
                        icon={
                          isTestingThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00bfff]" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-[#00ff88]" />
                          )
                        }
                      >
                        {isTestingThis ? 'Testing...' : 'Test Connection'}
                      </NeumoButton>
                    </div>
                  </NeumoCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Inbound Webhook Contract */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#00ff88]/20 text-[#00ff88] inline-flex items-center justify-center text-[11px]">2</span>
              Inbound Webhook Contract & Target Workflow
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">Target Workflow:</span>
              <input
                type="text"
                value={selectedWorkflowId}
                onChange={(e) => setSelectedWorkflowId(e.target.value)}
                className="bg-[#23252a] text-[#00bfff] font-mono text-xs px-2.5 py-1 rounded-lg border border-white/[0.04] outline-none shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] w-44"
              />
            </div>
          </div>

          <NeumoCard variant="protrude-sm" className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#23252a] border border-white/[0.04] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3 font-mono text-xs overflow-x-auto">
                <span className="px-2 py-0.5 rounded-md bg-[#00bfff]/20 text-[#00bfff] font-bold">
                  POST
                </span>
                <span className="text-slate-200 truncate select-all">
                  {executionEndpoint}
                </span>
              </div>
              <NeumoButton
                onClick={() => handleCopy('endpoint', executionEndpoint)}
                size="sm"
                icon={copiedKey === 'endpoint' ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedKey === 'endpoint' ? 'Copied' : 'Copy URL'}
              </NeumoButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400">Inbound Format:</span>
                <div className="p-2.5 rounded-lg bg-[#23252a] text-slate-300 border border-white/[0.03]">
                  Accepts direct CityPulse JSON or {"{ input: ... }"}
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400">Authentication:</span>
                <div className="p-2.5 rounded-lg bg-[#23252a] text-slate-300 border border-white/[0.03]">
                  Authorization: Bearer rl_live_... (API Key)
                </div>
              </div>
            </div>
          </NeumoCard>
        </div>

        {/* Section 3: Interactive Live Test Runner */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#ffaa00]/20 text-[#ffaa00] inline-flex items-center justify-center text-[11px]">3</span>
              Live Workflow Execution Test Runner
            </h2>
            <span className="text-[11px] text-slate-400">
              Dispatches execution through full engine pipeline
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Payload Editor */}
            <NeumoCard variant="protrude-sm" className="p-5 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold text-slate-300">
                    Inbound Civic Incident Payload (JSON):
                  </span>
                  <button
                    onClick={() =>
                      setTestPayload(
                        JSON.stringify(
                          {
                            issueId: `CP-${Date.now().toString().slice(-4)}`,
                            category: 'pothole',
                            severity: 'high',
                            ward: '12',
                            details: 'Hazardous road cavity near intersection'
                          },
                          null,
                          2
                        )
                      )
                    }
                    className="text-[11px] text-[#00bfff] hover:underline"
                  >
                    CityPulse Sample
                  </button>
                </div>
                <textarea
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  rows={9}
                  className="w-full bg-[#23252a] text-emerald-300 font-mono text-xs p-3.5 rounded-xl border border-white/[0.04] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.6)] focus:border-[#00bfff]/60 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Trigger → Condition → Action
                </span>
                <NeumoButton
                  onClick={handleRunTest}
                  disabled={testLoading}
                  variant="primary"
                  size="md"
                  icon={
                    testLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#00bfff]" />
                    ) : (
                      <Play className="w-4 h-4 fill-[#00bfff] text-[#00bfff]" />
                    )
                  }
                  className="font-bold tracking-wide"
                >
                  {testLoading ? 'Executing Workflow...' : 'Execute Test'}
                </NeumoButton>
              </div>
            </NeumoCard>

            {/* Test Execution Output Viewer */}
            <NeumoCard variant="recess" className="p-5 space-y-3 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-2">
                  <span>Live Execution Result</span>
                  {testDurationMs !== null && (
                    <span className="text-[10px] font-mono text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded">
                      {testDurationMs}ms
                    </span>
                  )}
                </span>
                {testResult && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                      testResult.summary.status === 'succeeded'
                        ? 'bg-[#00ff88]/20 text-[#00ff88]'
                        : 'bg-[#ff3366]/20 text-[#ff3366]'
                    }`}
                  >
                    {testResult.summary.status}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto max-h-56">
                {testLoading && (
                  <div className="h-44 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-[#00bfff]" />
                    <span className="text-xs font-mono">Running topological evaluator pipeline...</span>
                  </div>
                )}

                {testError && (
                  <div className="p-3.5 rounded-xl bg-[#ff3366]/10 border border-[#ff3366]/20 text-[#ff3366] text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{testError}</span>
                  </div>
                )}

                {!testLoading && !testError && !testResult && (
                  <div className="h-44 flex flex-col items-center justify-center gap-2 text-slate-500 text-center">
                    <Sparkles className="w-6 h-6 text-slate-600" />
                    <p className="text-xs">Click "Execute Test" to verify the workflow execution pipeline.</p>
                  </div>
                )}

                {testResult && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-2.5 rounded-lg bg-[#23252a] text-slate-300 text-[11px] space-y-1">
                      <div><span className="text-slate-500">Execution ID:</span> <span className="text-[#00bfff]">{testResult.execution.id}</span></div>
                      <div><span className="text-slate-500">Completed in:</span> {testResult.summary.totalDurationMs}ms</div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 uppercase">Steps Executed:</span>
                      {testResult.summary.steps.map((st, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-lg bg-[#23252a] border border-white/[0.03] text-[11px]"
                        >
                          <span className="text-slate-300 font-semibold">{st.nodeId}</span>
                          <span className="text-[#00ff88]">{st.status} ({st.durationMs}ms)</span>
                        </div>
                      ))}
                    </div>

                    <pre className="p-3 rounded-lg bg-[#1e2024] text-slate-300 text-[10px] overflow-x-auto max-h-32">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </NeumoCard>
          </div>
        </div>

        {/* Section 4: Code Snippets & CivicConnect Pattern */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#00bfff]/20 text-[#00bfff] inline-flex items-center justify-center text-[11px]">4</span>
              Integration Code Generator
            </h2>
            <span className="text-[11px] text-slate-400">
              Copy-pasteable client snippets
            </span>
          </div>

          <NeumoCard variant="protrude-sm" className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3 overflow-x-auto">
              <NeumoButton
                onClick={() => setActiveTab('civicconnect')}
                size="sm"
                active={activeTab === 'civicconnect'}
                variant={activeTab === 'civicconnect' ? 'primary' : 'default'}
                className="font-bold text-xs"
              >
                🏛️ CityPulse & Civic Pattern
              </NeumoButton>
              <NeumoButton
                onClick={() => setActiveTab('curl')}
                size="sm"
                active={activeTab === 'curl'}
                icon={<Terminal className="w-3.5 h-3.5" />}
              >
                cURL
              </NeumoButton>
              <NeumoButton
                onClick={() => setActiveTab('javascript')}
                size="sm"
                active={activeTab === 'javascript'}
                icon={<Code className="w-3.5 h-3.5" />}
              >
                JavaScript / Fetch
              </NeumoButton>
              <NeumoButton
                onClick={() => setActiveTab('nodejs')}
                size="sm"
                active={activeTab === 'nodejs'}
                icon={<Server className="w-3.5 h-3.5" />}
              >
                Node.js Express
              </NeumoButton>
              <NeumoButton
                onClick={() => setActiveTab('python')}
                size="sm"
                active={activeTab === 'python'}
                icon={<FileCode className="w-3.5 h-3.5" />}
              >
                Python
              </NeumoButton>
            </div>

            <div className="relative">
              <div className="absolute right-3 top-3 z-10">
                <NeumoButton
                  onClick={() => handleCopy(activeTab, snippets[activeTab])}
                  size="sm"
                  icon={copiedKey === activeTab ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                >
                  {copiedKey === activeTab ? 'Copied Snippet' : 'Copy Code'}
                </NeumoButton>
              </div>

              <pre className="bg-[#202226] text-slate-200 font-mono text-xs p-5 rounded-xl border border-white/[0.04] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)] overflow-x-auto leading-relaxed max-h-96">
                <code>{snippets[activeTab]}</code>
              </pre>
            </div>
          </NeumoCard>
        </div>

        {/* Modal */}
        <ConnectAppModal
          isOpen={isConnectModalOpen}
          projectId={resolvedProjectId}
          onClose={() => setIsConnectModalOpen(false)}
          onSuccess={(newInteg) => {
            setIntegrations((prev) => [newInteg, ...prev]);
            fetchIntegrations(resolvedProjectId);
          }}
        />
      </div>
    </div>
  );
};
