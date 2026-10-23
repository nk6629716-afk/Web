import React, { useState } from 'react';
import {
  ConditionOperator,
  ExecutionStepResult,
  NodeType,
  TransformOperation,
  WorkflowNode,
  AppIntegrationSafeResponse,
} from '@relay/shared';
import { Settings, Terminal, Trash2, Layers, Cpu, Globe } from 'lucide-react';
import { StatusLED, LEDStatus } from '../ui/StatusLED';
import { NeumoButton } from '../ui/NeumoButton';
import { NeumoInput, NeumoTextarea, NeumoSelect } from '../ui/NeumoInput';

interface InspectorPanelProps {
  selectedNode: WorkflowNode | null;
  selectedStepResult?: ExecutionStepResult | null;
  onUpdateNodeData: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;
  onDeleteNode: (nodeId: string) => void;
  totalNodes: number;
  totalEdges: number;
  availableIntegrations?: AppIntegrationSafeResponse[];
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedNode,
  selectedStepResult,
  onUpdateNodeData,
  onDeleteNode,
  totalNodes,
  totalEdges,
  availableIntegrations = [],
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'execution'>('config');

  if (!selectedNode) {
    return (
      <aside className="w-80 bg-[#292b30] border-l border-white/[0.04] p-5 flex flex-col z-20 select-none shadow-[-4px_0_12px_rgba(0,0,0,0.25)]">
        {/* Header Plaque */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00bfff]" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
              GRAPH TELEMETRY
            </span>
          </div>
          <StatusLED status="idle" size="sm" />
        </div>

        {/* Overview Stat Blocks */}
        <div className="mt-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#292b30] border border-white/[0.03] shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.08)] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">ACTIVE NODES</span>
              <span className="font-mono font-bold text-[#00bfff] px-2 py-0.5 rounded bg-[#24262b] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
                {totalNodes}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">CONNECTIONS</span>
              <span className="font-mono font-bold text-[#00ff88] px-2 py-0.5 rounded bg-[#24262b] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
                {totalEdges}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#24262b] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.5),inset_-3px_-3px_6px_rgba(255,255,255,0.06)] border border-white/[0.02] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-[#00bfff]" />
              <span>Tactile Controls</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Select any node on the canvas to configure properties or inspect real execution metrics and input/output payloads.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const { id, type, data } = selectedNode;
  const config = data.config || {};

  const handleConfigChange = (field: string, val: any) => {
    onUpdateNodeData(id, {
      ...data,
      config: {
        ...config,
        [field]: val,
      },
    });
  };

  const handleLabelChange = (newLabel: string) => {
    onUpdateNodeData(id, {
      ...data,
      label: newLabel,
    });
  };

  const nodeLEDStatus: LEDStatus =
    data.status === 'succeeded'
      ? 'success'
      : data.status === 'running'
      ? 'running'
      : data.status === 'failed'
      ? 'failed'
      : 'idle';

  return (
    <aside className="w-80 bg-[#292b30] border-l border-white/[0.04] flex flex-col z-20 overflow-hidden select-none shadow-[-4px_0_12px_rgba(0,0,0,0.25)]">
      {/* Header Plaque */}
      <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusLED status={nodeLEDStatus} size="sm" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#00bfff]">
              {type}
            </span>
            <span className="text-xs text-slate-300 font-mono truncate">{id}</span>
          </div>
        </div>
        <NeumoButton
          onClick={() => onDeleteNode(id)}
          size="sm"
          variant="danger"
          icon={<Trash2 className="w-3.5 h-3.5 text-[#ff3366]" />}
          title="Delete module"
        />
      </div>

      {/* Tactile Tab Switcher (Recessed Track with Protruding Active Pill) */}
      <div className="p-2.5 border-b border-white/[0.04]">
        <div className="p-1 rounded-xl bg-[#24262b] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.06)] flex gap-1">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-all duration-150 ${
              activeTab === 'config'
                ? 'bg-[#292b30] text-slate-100 shadow-[2px_2px_5px_rgba(0,0,0,0.4),-2px_-2px_5px_rgba(255,255,255,0.08)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3 h-3 text-[#00bfff]" />
            <span>CONFIG</span>
          </button>
          <button
            onClick={() => setActiveTab('execution')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-all duration-150 ${
              activeTab === 'execution'
                ? 'bg-[#292b30] text-slate-100 shadow-[2px_2px_5px_rgba(0,0,0,0.4),-2px_-2px_5px_rgba(255,255,255,0.08)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3 h-3 text-[#00ff88]" />
            <span>EXECUTION</span>
            {selectedStepResult && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'config' && (
          <div className="space-y-4">
            <NeumoInput
              label="Module Label"
              value={data.label || ''}
              onChange={(e) => handleLabelChange(e.target.value)}
            />

            {/* Type Specific Fields */}
            {type === 'trigger' && (
              <NeumoTextarea
                label="Simulated Payload (JSON)"
                rows={7}
                value={
                  typeof config.payload === 'string'
                    ? config.payload
                    : JSON.stringify(config.payload || {}, null, 2)
                }
                onChange={(e) => handleConfigChange('payload', e.target.value)}
              />
            )}

            {type === 'transform' && (
              <div className="space-y-3">
                <NeumoSelect
                  label="Operation Mode"
                  value={config.operation || 'trim'}
                  onChange={(e) =>
                    handleConfigChange('operation', e.target.value as TransformOperation)
                  }
                >
                  <option value="trim">Trim Whitespace</option>
                  <option value="lowercase">Convert to Lowercase</option>
                  <option value="uppercase">Convert to Uppercase</option>
                  <option value="extract_field">Extract Field</option>
                  <option value="template">String Template Interpolation</option>
                </NeumoSelect>

                <NeumoInput
                  label="Target Input Field"
                  value={config.field || ''}
                  onChange={(e) => handleConfigChange('field', e.target.value)}
                  placeholder="e.g. email or fullName"
                />

                <NeumoInput
                  label="Output Field Key"
                  value={config.outputField || ''}
                  onChange={(e) => handleConfigChange('outputField', e.target.value)}
                  placeholder="e.g. normalizedEmail"
                />

                {config.operation === 'template' && (
                  <NeumoTextarea
                    label="String Template (use {{key}})"
                    rows={3}
                    value={config.template || ''}
                    onChange={(e) => handleConfigChange('template', e.target.value)}
                    placeholder="Hello {{name}}, role is {{role}}"
                  />
                )}
              </div>
            )}

            {type === 'condition' && (
              <div className="space-y-3">
                <NeumoInput
                  label="Condition Field"
                  value={config.field || ''}
                  onChange={(e) => handleConfigChange('field', e.target.value)}
                  placeholder="e.g. role"
                />

                <NeumoSelect
                  label="Comparison Operator"
                  value={config.operator || 'equals'}
                  onChange={(e) =>
                    handleConfigChange('operator', e.target.value as ConditionOperator)
                  }
                >
                  <option value="equals">Equals (==)</option>
                  <option value="not_equals">Not Equals (!=)</option>
                  <option value="contains">Contains Substring</option>
                  <option value="greater_than">Greater Than (&gt;)</option>
                  <option value="less_than">Less Than (&lt;)</option>
                  <option value="is_empty">Is Empty / Null</option>
                  <option value="is_not_empty">Is Not Empty</option>
                </NeumoSelect>

                <NeumoInput
                  label="Expected Value"
                  value={config.value !== undefined ? String(config.value) : ''}
                  onChange={(e) => handleConfigChange('value', e.target.value)}
                  placeholder="e.g. admin or 100"
                />
              </div>
            )}

            {type === 'output' && (
              <div className="space-y-3">
                <NeumoSelect
                  label="Destination Target"
                  value={config.destination || 'response'}
                  onChange={(e) => handleConfigChange('destination', e.target.value)}
                >
                  <option value="response">Synchronous API Response</option>
                  <option value="integration">External Connected App (CityPulse / Webhook)</option>
                </NeumoSelect>

                {config.destination === 'integration' && (
                  <div className="p-3 rounded-xl bg-[#24262b] border border-white/[0.04] space-y-3 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
                    <NeumoSelect
                      label="Select Connected App"
                      value={config.integrationId || ''}
                      onChange={(e) => handleConfigChange('integrationId', e.target.value)}
                    >
                      <option value="">-- Choose Integration --</option>
                      {availableIntegrations.map((integ) => (
                        <option key={integ.id} value={integ.id}>
                          {integ.name} ({integ.baseUrl})
                        </option>
                      ))}
                    </NeumoSelect>

                    {availableIntegrations.length === 0 && (
                      <p className="text-[10px] text-amber-400">
                        No integrations configured. Add one in the Integrations dashboard tab.
                      </p>
                    )}

                    <NeumoInput
                      label="Endpoint Sub-path (Optional)"
                      value={config.endpointPath || ''}
                      onChange={(e) => handleConfigChange('endpointPath', e.target.value)}
                      placeholder="e.g. /api/v1/civic/issues"
                    />

                    {config.integrationId && (
                      (() => {
                        const sel = availableIntegrations.find((i) => i.id === config.integrationId);
                        if (!sel) return null;
                        return (
                          <div className="p-2 rounded-lg bg-[#202226] text-[10px] font-mono text-slate-400 space-y-0.5 border border-white/[0.02]">
                            <div><span className="text-slate-500">Target:</span> {sel.baseUrl}{config.endpointPath || ''}</div>
                            <div><span className="text-slate-500">Method:</span> {sel.httpMethod} • <span className="text-slate-500">Auth:</span> {sel.authType.toUpperCase()}</div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                <NeumoInput
                  label="Destination Title"
                  value={config.title || ''}
                  onChange={(e) => handleConfigChange('title', e.target.value)}
                  placeholder="e.g. Onboarding Complete"
                />

                <NeumoTextarea
                  label="Message Template (Optional)"
                  rows={3}
                  value={config.messageTemplate || ''}
                  onChange={(e) => handleConfigChange('messageTemplate', e.target.value)}
                  placeholder="User {{email}} registered successfully."
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'execution' && (
          <div className="space-y-4">
            {selectedStepResult ? (
              <div className="space-y-3">
                {/* Metric Strip */}
                <div className="p-3 rounded-xl bg-[#24262b] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)] border border-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusLED
                      status={
                        selectedStepResult.status === 'succeeded'
                          ? 'success'
                          : selectedStepResult.status === 'failed'
                          ? 'failed'
                          : selectedStepResult.status === 'running'
                          ? 'running'
                          : 'idle'
                      }
                      size="sm"
                    />
                    <span className="text-xs font-mono font-bold uppercase text-slate-200">
                      {selectedStepResult.status}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#00bfff]">
                    {selectedStepResult.durationMs}ms
                  </span>
                </div>

                {selectedStepResult.errorMessage && (
                  <div className="p-3 rounded-xl bg-[#ff3366]/10 border border-[#ff3366]/30 text-[#ff5580] text-xs">
                    <p className="font-semibold mb-1">Execution Failure:</p>
                    <p className="font-mono text-[11px]">{selectedStepResult.errorMessage}</p>
                  </div>
                )}

                {/* Input Payload */}
                <div>
                  <span className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                    INPUT PAYLOAD
                  </span>
                  <pre className="font-mono text-[11px] bg-[#222428] p-2.5 rounded-xl border border-white/[0.03] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.5)] text-slate-300 overflow-x-auto max-h-36">
                    {JSON.stringify(selectedStepResult.input || {}, null, 2)}
                  </pre>
                </div>

                {/* Output Payload */}
                <div>
                  <span className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                    OUTPUT RESULT
                  </span>
                  <pre className="font-mono text-[11px] bg-[#222428] p-2.5 rounded-xl border border-white/[0.03] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.5)] text-[#00ff88] overflow-x-auto max-h-48">
                    {JSON.stringify(selectedStepResult.output || {}, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#24262b] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)] text-center text-xs text-slate-400">
                <StatusLED status="idle" size="md" className="mx-auto mb-2" />
                <p>No execution recorded for this module yet.</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Click RUN WORKFLOW in the top bar to trigger live execution.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
