import React, { useState } from 'react';
import {
  X,
  Link,
  ShieldCheck,
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  Globe,
  Settings2,
  KeyRound,
  Clock,
  Sparkles
} from 'lucide-react';
import { AuthType, AppIntegrationSafeResponse, TestConnectionResult } from '@relay/shared';
import { api } from '../lib/api';
import { NeumoButton } from './ui/NeumoButton';
import { NeumoCard } from './ui/NeumoCard';
import { NeumoInput, NeumoSelect, NeumoTextarea } from './ui/NeumoInput';
import { StatusLED } from './ui/StatusLED';

interface ConnectAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (integration: AppIntegrationSafeResponse) => void;
  projectId?: string;
}

export const ConnectAppModal: React.FC<ConnectAppModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId = 'demo-project-001',
}) => {
  if (!isOpen) return null;

  const formRef = React.useRef<HTMLFormElement>(null);

  // Form State
  const [appType, setAppType] = useState<'citypulse' | 'generic_http'>('citypulse');
  const [name, setName] = useState('CityPulse Civic Gateway');
  const [baseUrl, setBaseUrl] = useState('https://api.citypulse.civic.local');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('POST');
  const [authType, setAuthType] = useState<AuthType>('bearer');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [authHeaderName, setAuthHeaderName] = useState('X-API-Key');
  const [headersJson, setHeadersJson] = useState('{\n  "X-Relay-Client": "Relay-Automation"\n}');
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [testEndpoint, setTestEndpoint] = useState('/health');
  const [testMethod, setTestMethod] = useState<'GET' | 'POST'>('GET');

  // Action states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Preset switch
  const handleSelectPreset = (preset: 'citypulse' | 'generic_http') => {
    setAppType(preset);
    setFormError(null);
    setTestResult(null);
    setIsSuccess(false);

    if (preset === 'citypulse') {
      setName('CityPulse Civic Gateway');
      setBaseUrl('https://api.citypulse.civic.local');
      setHttpMethod('POST');
      setAuthType('bearer');
      setTestEndpoint('/health');
      setTestMethod('GET');
      setTimeoutMs(5000);
      setHeadersJson('{\n  "X-Relay-Client": "Relay-Automation"\n}');
    } else {
      setName('');
      setBaseUrl('');
      setHttpMethod('POST');
      setAuthType('none');
      setSecret('');
      setTestEndpoint('');
      setTestMethod('GET');
      setTimeoutMs(5000);
      setHeadersJson('{}');
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      setFormError('Please enter a Base URL or API endpoint first.');
      return;
    }

    let parsedHeaders = {};
    if (headersJson.trim()) {
      try {
        parsedHeaders = JSON.parse(headersJson);
      } catch {
        setFormError('Headers must be valid JSON.');
        return;
      }
    }

    setIsTesting(true);
    setFormError(null);
    setTestResult(null);

    try {
      const result = await api.testIntegrationDirect({
        baseUrl: baseUrl.trim(),
        httpMethod,
        authType,
        secret: secret.trim() || undefined,
        authHeaderName: (authType === 'api_key' || authType === 'custom_header') ? authHeaderName : undefined,
        headers: parsedHeaders,
        timeoutMs: Number(timeoutMs) || 5000,
        testEndpoint: testEndpoint.trim() || undefined,
        testMethod
      });

      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        durationMs: 0,
        message: err.message || 'Connection test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save Integration
  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    if (isSaving) return;

    if (!name.trim()) {
      setFormError('Integration Name is required.');
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!baseUrl.trim()) {
      setFormError('Base URL is required.');
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let parsedHeaders = {};
    if (headersJson.trim()) {
      try {
        parsedHeaders = JSON.parse(headersJson);
      } catch {
        setFormError('Headers must be valid JSON.');
        formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setIsSaving(true);
    setFormError(null);
    setIsSuccess(false);

    try {
      // Ensure targetProjectId is a valid UUID or resolved from project list
      let targetProjectId = projectId;
      if (!targetProjectId || targetProjectId === 'demo-project-001' || !targetProjectId.includes('-')) {
        try {
          const projs = await api.getProjects();
          if (projs && projs.length > 0) {
            targetProjectId = projs[0].id;
          }
        } catch {
          // Keep existing
        }
      }

      const integration = await api.createIntegration({
        projectId: targetProjectId,
        name: name.trim(),
        appType,
        baseUrl: baseUrl.trim(),
        httpMethod,
        authType,
        secret: secret.trim() || undefined,
        authHeaderName: (authType === 'api_key' || authType === 'custom_header') ? authHeaderName.trim() : undefined,
        headers: parsedHeaders,
        timeoutMs: Number(timeoutMs) || 5000,
        testEndpoint: testEndpoint.trim() || undefined,
        testMethod
      });

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess(integration);
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Failed to create integration:', err);
      setFormError(err.message || 'Failed to save integration.');
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#292b30] rounded-2xl border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_1px_1px_2px_rgba(255,255,255,0.08)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between bg-[#24262b]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#292b30] flex items-center justify-center text-[#00bfff] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
              <Link className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide uppercase text-slate-100 flex items-center gap-2">
                Connect External Application
              </h2>
              <p className="text-[11px] text-slate-400">
                Configure generic HTTP integrations or pre-built connectors with encrypted credentials
              </p>
            </div>
          </div>
          <NeumoButton
            onClick={onClose}
            size="sm"
            icon={<X className="w-4 h-4 text-slate-400" />}
            title="Close modal"
          />
        </div>

        {/* Modal Body */}
        <form 
          ref={formRef} 
          id="connect-app-form" 
          onSubmit={handleSave} 
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Preset Selector */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase text-slate-300">
              Quick Preset / Template
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectPreset('citypulse')}
                className={`p-3.5 rounded-xl text-left border transition-all ${
                  appType === 'citypulse'
                    ? 'bg-[#24262b] border-[#00bfff]/60 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]'
                    : 'bg-[#292b30] border-white/[0.04] hover:border-white/[0.1] shadow-[2px_2px_5px_rgba(0,0,0,0.3)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00bfff]" />
                    CityPulse Civic Gateway
                  </span>
                  {appType === 'citypulse' && <span className="w-2 h-2 rounded-full bg-[#00bfff]" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Municipal incident dispatch & civic issue reporting integration
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('generic_http')}
                className={`p-3.5 rounded-xl text-left border transition-all ${
                  appType === 'generic_http'
                    ? 'bg-[#24262b] border-[#00bfff]/60 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]'
                    : 'bg-[#292b30] border-white/[0.04] hover:border-white/[0.1] shadow-[2px_2px_5px_rgba(0,0,0,0.3)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-300" />
                    Generic REST / HTTP
                  </span>
                  {appType === 'generic_http' && <span className="w-2 h-2 rounded-full bg-[#00bfff]" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Custom base URL, arbitrary headers, webhook, or external microservice
                </p>
              </button>
            </div>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="p-3.5 rounded-xl bg-[#ff3366]/10 border border-[#ff3366]/30 text-[#ff5580] text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Basic Config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NeumoInput
              label="Application Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CityPulse Civic Gateway"
              required
            />

            <NeumoSelect
              label="Default HTTP Method"
              value={httpMethod}
              onChange={(e) => setHttpMethod(e.target.value as any)}
            >
              <option value="POST">POST (Recommended)</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="GET">GET</option>
              <option value="DELETE">DELETE</option>
            </NeumoSelect>
          </div>

          {/* URL & Timeout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <NeumoInput
                label="Base URL / API Endpoint"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.yourdomain.com"
                required
              />
            </div>
            <div>
              <NeumoInput
                label="Timeout (ms)"
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                min={500}
                max={30000}
              />
            </div>
          </div>

          {/* Security & Authentication */}
          <NeumoCard variant="recess-sm" className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <KeyRound className="w-3.5 h-3.5 text-[#00bfff]" />
                <span>Authentication & Secret Management</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#00ff88]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AES-256-GCM ENCRYPTED</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NeumoSelect
                label="Authentication Type"
                value={authType}
                onChange={(e) => setAuthType(e.target.value as AuthType)}
              >
                <option value="none">No Authentication</option>
                <option value="bearer">Bearer Token (Authorization: Bearer ...)</option>
                <option value="api_key">API Key Header</option>
                <option value="basic">HTTP Basic Auth</option>
                <option value="custom_header">Custom Header Value</option>
              </NeumoSelect>

              {(authType === 'api_key' || authType === 'custom_header') && (
                <NeumoInput
                  label="Auth Header Name"
                  value={authHeaderName}
                  onChange={(e) => setAuthHeaderName(e.target.value)}
                  placeholder="e.g. X-API-Key or X-CityPulse-Token"
                />
              )}
            </div>

            {authType !== 'none' && (
              <div className="relative">
                <NeumoInput
                  label={
                    authType === 'bearer'
                      ? 'Bearer Token Secret'
                      : authType === 'basic'
                      ? 'Username:Password String'
                      : 'Secret Token / Key'
                  }
                  type={showSecret ? 'text' : 'password'}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Paste sensitive token or credential..."
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-slate-200 transition-colors"
                  title={showSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <p className="text-[10px] text-slate-400 mt-1">
                  🔒 This credential is encrypted on the server before storage and will never be returned to the browser.
                </p>
              </div>
            )}
          </NeumoCard>

          {/* Custom Headers */}
          <div>
            <NeumoTextarea
              label="Default Request Headers (JSON)"
              rows={3}
              value={headersJson}
              onChange={(e) => setHeadersJson(e.target.value)}
              placeholder='{\n  "X-Custom-Header": "value"\n}'
            />
          </div>

          {/* Connection Test Configuration */}
          <NeumoCard variant="protrude-sm" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-[#ffaa00]" />
                Health Check & Connection Test Request
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Optional Custom Probe
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <NeumoInput
                  label="Test Path / Endpoint"
                  value={testEndpoint}
                  onChange={(e) => setTestEndpoint(e.target.value)}
                  placeholder="/health or leave empty to test base URL"
                />
              </div>
              <div>
                <NeumoSelect
                  label="Test Method"
                  value={testMethod}
                  onChange={(e) => setTestMethod(e.target.value as any)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </NeumoSelect>
              </div>
            </div>

            {/* Live Test Action and Feedback */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/[0.04]">
              <NeumoButton
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                size="sm"
                icon={
                  isTesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00bfff]" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-[#00ff88]" />
                  )
                }
              >
                {isTesting ? 'Sending Test Probe...' : 'Test Connection Now'}
              </NeumoButton>

              {testResult && (
                <div
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 border ${
                    testResult.success
                      ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20'
                      : 'bg-[#ff3366]/10 text-[#ff5580] border-[#ff3366]/20'
                  }`}
                >
                  <StatusLED status={testResult.success ? 'success' : 'failed'} size="sm" />
                  <span>
                    {testResult.success ? 'SUCCESS' : 'FAILED'}: {testResult.message} ({testResult.durationMs}ms)
                  </span>
                </div>
              )}
            </div>
          </NeumoCard>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.05] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#24262b]">
          {formError ? (
            <div className="flex items-center gap-2 text-xs text-[#ff5580] max-w-sm truncate" title={formError}>
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#ff3366]" />
              <span className="truncate">{formError}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">
              Available to workflow action nodes upon saving
            </span>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <NeumoButton type="button" onClick={onClose} size="sm" disabled={isSaving}>
              Cancel
            </NeumoButton>
            <NeumoButton
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              variant={isSuccess ? 'success' : 'primary'}
              size="md"
              icon={
                isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#00bfff]" />
                ) : isSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#00bfff]" />
                )
              }
              className="font-bold tracking-wide"
            >
              {isSaving ? 'Connecting App...' : isSuccess ? 'Connected!' : 'Save & Connect'}
            </NeumoButton>
          </div>
        </div>
      </div>
    </div>
  );
};
