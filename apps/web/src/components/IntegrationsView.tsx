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
  Sparkles
} from 'lucide-react';
import { Workflow, Project } from '@relay/shared';
import { api, getApiBaseUrl, ExecutionResponse } from '../lib/api';
import { NeumoButton } from './ui/NeumoButton';
import { NeumoCard } from './ui/NeumoCard';
import { StatusLED } from './ui/StatusLED';

interface IntegrationsViewProps {
  currentWorkflowId?: string;
  onOpenStudio?: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  currentWorkflowId = 'demo-workflow-001',
  onOpenStudio,
}) => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(currentWorkflowId);
  const [activeTab, setActiveTab] = useState<'curl' | 'javascript' | 'nodejs' | 'python' | 'civicconnect'>('civicconnect');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
  }, []);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
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
 * CIVICCONNECT — Resilient 5-Step Backend Integration Pattern
 * 
 * Flow:
 * 1. Validate & store citizen report in CivicConnect DB FIRST.
 * 2. Dispatch execution request to Relay Workflow.
 * 3. Update report with Relay execution ID & status.
 * 4. Return instant confirmation to citizen.
 * 5. Background queue retries if Relay is temporarily unreachable.
 */

import { Router } from 'express';
const router = Router();

const RELAY_WORKFLOW_URL = "${executionEndpoint}";

router.post('/api/reports', async (req, res) => {
  // 1. Save citizen report to CivicConnect database first (prevents data loss)
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          orderId: report.id,
          customer: report.citizenEmail,
          amount: req.body.estimatedImpact || 5000,
          reason: report.details
        }
      }),
      signal: AbortSignal.timeout(8000) // 8s safety timeout
    });

    const { execution, summary } = await relayResponse.json();

    // 3. Update local CivicConnect record with verified execution output
    await civicDb.reports.update(report.id, {
      relayExecutionId: execution.id,
      relayStatus: summary.status,
      processedAt: new Date().toISOString()
    });

    // 4. Return successful response with tracking
    return res.status(201).json({
      success: true,
      reportId: report.id,
      relayExecutionId: execution.id,
      status: summary.status
    });
  } catch (err) {
    console.error('Relay execution deferred, queuing retry:', err);
    // 5. If Relay is temporarily offline, enqueue retry without dropping citizen report!
    await retryQueue.enqueue({ reportId: report.id });

    return res.status(202).json({
      success: true,
      reportId: report.id,
      status: 'queued_for_automation',
      message: 'Report received and queued for workflow triage.'
    });
  }
});`
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#292b30] p-8 text-slate-100 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.05]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black tracking-wide uppercase text-slate-100">
                External App & Web Integration
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono border bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20">
                <StatusLED status="success" size="sm" />
                <span>REST API ACTIVE</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Connect CivicConnect and third-party web apps to trigger Relay automation workflows
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NeumoButton
              onClick={fetchHealth}
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isHealthLoading ? 'animate-spin' : ''}`} />}
              title="Refresh health check"
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

        {/* Live Service Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NeumoCard variant="recess-sm" className="p-4 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#23252a] flex items-center justify-center text-[#00bfff] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Relay Backend</div>
              <div className="text-xs font-bold text-slate-100 truncate">
                {baseUrl.replace(/https?:\/\//, '')}
              </div>
            </div>
          </NeumoCard>

          <NeumoCard variant="recess-sm" className="p-4 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#23252a] flex items-center justify-center text-[#00ff88] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Target Workflow</div>
              <div className="text-xs font-mono font-bold text-[#00bfff]">
                {selectedWorkflowId}
              </div>
            </div>
          </NeumoCard>

          <NeumoCard variant="recess-sm" className="p-4 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#23252a] flex items-center justify-center text-[#ffaa00] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">CivicConnect Status</div>
              <div className="text-xs font-bold text-slate-200">
                {testResult ? (
                  <span className="text-[#00ff88]">Verified & Tested</span>
                ) : (
                  <span>Ready to Connect</span>
                )}
              </div>
            </div>
          </NeumoCard>
        </div>

        {/* Step 1: Endpoint & Contract Inspector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#00bfff]/20 text-[#00bfff] inline-flex items-center justify-center text-[11px]">1</span>
              Verified HTTP API Contract
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">Workflow ID:</span>
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
                <span className="text-[11px] text-slate-400">Headers:</span>
                <div className="p-2.5 rounded-lg bg-[#23252a] text-slate-300 border border-white/[0.03]">
                  Content-Type: application/json
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400">Response Format:</span>
                <div className="p-2.5 rounded-lg bg-[#23252a] text-slate-300 border border-white/[0.03]">
                  200 OK — JSON (execution + summary)
                </div>
              </div>
            </div>
          </NeumoCard>
        </div>

        {/* Step 2: Interactive Live Test Runner */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#00ff88]/20 text-[#00ff88] inline-flex items-center justify-center text-[11px]">2</span>
              Interactive Live Test Runner
            </h2>
            <span className="text-[11px] text-slate-400">
              Sends real request to Relay execution engine
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Payload Editor */}
            <NeumoCard variant="protrude-sm" className="p-5 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold text-slate-300">
                    Input JSON Payload (Trigger Node):
                  </span>
                  <button
                    onClick={() =>
                      setTestPayload(
                        JSON.stringify(
                          {
                            orderId: `CIVIC-${Date.now().toString().slice(-4)}`,
                            amount: 15000,
                            customer: '  ALEX CHEN  ',
                            reason: 'High impact street lighting outage'
                          },
                          null,
                          2
                        )
                      )
                    }
                    className="text-[11px] text-[#00bfff] hover:underline"
                  >
                    Reset Sample
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
                  Node evaluators: <span className="text-slate-200">trim_and_lowercase, condition</span>
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

        {/* Step 3: Code Snippets & CivicConnect Pattern */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#ffaa00]/20 text-[#ffaa00] inline-flex items-center justify-center text-[11px]">3</span>
              Integration Code Generator
            </h2>
            <span className="text-[11px] text-slate-400">
              Copy-pasteable integration for CivicConnect backend
            </span>
          </div>

          <NeumoCard variant="protrude-sm" className="p-5 space-y-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3 overflow-x-auto">
              <NeumoButton
                onClick={() => setActiveTab('civicconnect')}
                size="sm"
                active={activeTab === 'civicconnect'}
                variant={activeTab === 'civicconnect' ? 'primary' : 'default'}
                className="font-bold text-xs"
              >
                🏛️ CivicConnect Pattern
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

            {/* Code Block with Copy */}
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

        {/* Security & Secrets Guidance */}
        <div className="p-5 rounded-2xl bg-[#23252a] border border-white/[0.04] text-xs space-y-2">
          <div className="flex items-center gap-2 text-[#00bfff] font-bold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Architecture & Security Best Practices</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            • <strong>Backend-to-Backend:</strong> CivicConnect should call Relay from its server/API route, not directly from citizen browsers. This guarantees that API credentials and retry logic remain secure.<br />
            • <strong>Zero Data Loss:</strong> CivicConnect saves reports to its database before invoking Relay, so an offline network spike never loses citizen submissions.<br />
            • <strong>No Privileged Secrets in Client:</strong> Never embed Supabase Service Role keys in frontend bundles or Git repositories.
          </p>
        </div>
      </div>
    </div>
  );
};
