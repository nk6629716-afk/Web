import React, { useState } from 'react';
import {
  ConditionOperator,
  ExecutionStepResult,
  NodeStatus,
  NodeType,
  TransformOperation,
  WorkflowNode,
} from '@relay/shared';
import {
  Settings,
  Terminal,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

interface InspectorPanelProps {
  selectedNode: WorkflowNode | null;
  selectedStepResult?: ExecutionStepResult | null;
  onUpdateNodeData: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;
  onDeleteNode: (nodeId: string) => void;
  totalNodes: number;
  totalEdges: number;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedNode,
  selectedStepResult,
  onUpdateNodeData,
  onDeleteNode,
  totalNodes,
  totalEdges,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'execution'>('config');

  if (!selectedNode) {
    return (
      <aside className="w-80 border-l border-white/10 bg-[#0d121f]/95 backdrop-blur-md flex flex-col p-5 select-none z-20">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm pb-4 border-b border-white/10">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Graph Overview</span>
        </div>

        <div className="mt-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Nodes</span>
              <span className="font-mono font-bold text-slate-200">{totalNodes}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Connections (Edges)</span>
              <span className="font-mono font-bold text-slate-200">{totalEdges}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-500/20 space-y-2">
            <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Inspector Guide</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Click any node on the canvas to configure its properties, edit transform rules, or inspect real-time execution outputs.
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

  return (
    <aside className="w-80 border-l border-white/10 bg-[#0d121f]/95 backdrop-blur-md flex flex-col z-20 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-white/10 text-slate-200">
            {type}
          </span>
          <span className="text-xs text-slate-400 font-mono truncate">{id}</span>
        </div>
        <button
          onClick={() => onDeleteNode(id)}
          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
          title="Delete node"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-slate-900/40">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === 'config'
              ? 'text-blue-400 border-blue-500 bg-white/5'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Config</span>
        </button>
        <button
          onClick={() => setActiveTab('execution')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2 relative ${
            activeTab === 'execution'
              ? 'text-blue-400 border-blue-500 bg-white/5'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Execution</span>
          {selectedStepResult && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'config' && (
          <div className="space-y-4">
            {/* Label input */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Node Label
              </label>
              <input
                type="text"
                value={data.label || ''}
                onChange={(e) => handleLabelChange(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none transition-all"
              />
            </div>

            {/* Type Specific Fields */}
            {type === 'trigger' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Mock Payload (JSON)
                  </label>
                </div>
                <textarea
                  rows={8}
                  value={
                    typeof config.payload === 'string'
                      ? config.payload
                      : JSON.stringify(config.payload || {}, null, 2)
                  }
                  onChange={(e) => handleConfigChange('payload', e.target.value)}
                  className="w-full font-mono text-[11px] bg-slate-950 border border-white/10 focus:border-emerald-500 rounded-lg p-2 text-emerald-300 outline-none resize-none transition-all"
                  placeholder='{ "userId": "123", "email": "test@relay.dev" }'
                />
              </div>
            )}

            {type === 'transform' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Operation
                  </label>
                  <select
                    value={config.operation || 'trim'}
                    onChange={(e) => handleConfigChange('operation', e.target.value as TransformOperation)}
                    className="w-full bg-slate-900/80 border border-white/10 focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                  >
                    <option value="trim">Trim Whitespace</option>
                    <option value="lowercase">Convert to Lowercase</option>
                    <option value="uppercase">Convert to Uppercase</option>
                    <option value="extract_field">Extract Field</option>
                    <option value="template">String Template Interpolation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Target Input Field
                  </label>
                  <input
                    type="text"
                    value={config.field || ''}
                    onChange={(e) => handleConfigChange('field', e.target.value)}
                    placeholder="e.g. email or fullName"
                    className="w-full bg-slate-900/80 border border-white/10 focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Output Field Key
                  </label>
                  <input
                    type="text"
                    value={config.outputField || ''}
                    onChange={(e) => handleConfigChange('outputField', e.target.value)}
                    placeholder="e.g. normalizedEmail"
                    className="w-full bg-slate-900/80 border border-white/10 focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                  />
                </div>

                {config.operation === 'template' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Template (Use &#123;&#123;field&#125;&#125;)
                    </label>
                    <textarea
                      rows={3}
                      value={config.template || ''}
                      onChange={(e) => handleConfigChange('template', e.target.value)}
                      placeholder="Hello {{name}}, your role is {{role}}"
                      className="w-full font-mono text-xs bg-slate-950 border border-white/10 focus:border-violet-500 rounded-lg p-2 text-violet-200 outline-none resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            {type === 'condition' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Condition Field
                  </label>
                  <input
                    type="text"
                    value={config.field || ''}
                    onChange={(e) => handleConfigChange('field', e.target.value)}
                    placeholder="e.g. role"
                    className="w-full bg-slate-900/80 border border-white/10 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Operator
                  </label>
                  <select
                    value={config.operator || 'equals'}
                    onChange={(e) => handleConfigChange('operator', e.target.value as ConditionOperator)}
                    className="w-full bg-slate-900/80 border border-white/10 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                  >
                    <option value="equals">Equals (==)</option>
                    <option value="not_equals">Not Equals (!=)</option>
                    <option value="contains">Contains Substring</option>
                    <option value="greater_than">Greater Than (&gt;)</option>
                    <option value="less_than">Less Than (&lt;)</option>
                    <option value="is_empty">Is Empty / Null</option>
                    <option value="is_not_empty">Is Not Empty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Expected Value
                  </label>
                  <input
                    type="text"
                    value={config.value !== undefined ? String(config.value) : ''}
                    onChange={(e) => handleConfigChange('value', e.target.value)}
                    placeholder="e.g. admin or 100"
                    className="w-full bg-slate-900/80 border border-white/10 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                  />
                </div>
              </div>
            )}

            {type === 'output' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Output Title
                  </label>
                  <input
                    type="text"
                    value={config.title || ''}
                    onChange={(e) => handleConfigChange('title', e.target.value)}
                    placeholder="e.g. Onboarding Complete"
                    className="w-full bg-slate-900/80 border border-white/10 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Message Template
                  </label>
                  <textarea
                    rows={3}
                    value={config.messageTemplate || ''}
                    onChange={(e) => handleConfigChange('messageTemplate', e.target.value)}
                    placeholder="User {{email}} registered successfully."
                    className="w-full font-mono text-xs bg-slate-950 border border-white/10 focus:border-sky-500 rounded-lg p-2 text-sky-200 outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'execution' && (
          <div className="space-y-4">
            {selectedStepResult ? (
              <div className="space-y-3">
                {/* Status Bar */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/70 border border-white/10">
                  <div className="flex items-center gap-2">
                    {selectedStepResult.status === 'succeeded' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : selectedStepResult.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : selectedStepResult.status === 'running' ? (
                      <Activity className="w-4 h-4 text-sky-400 animate-pulse" />
                    ) : selectedStepResult.status === 'skipped' ? (
                      <Ban className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs font-semibold capitalize text-slate-200">
                      {selectedStepResult.status}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {selectedStepResult.durationMs}ms
                  </span>
                </div>

                {selectedStepResult.errorMessage && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                    <p className="font-semibold mb-1">Execution Failure:</p>
                    <p className="font-mono text-[11px]">{selectedStepResult.errorMessage}</p>
                  </div>
                )}

                {/* Input Payload */}
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Input Payload
                  </span>
                  <pre className="font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-white/5 text-slate-300 overflow-x-auto max-h-40">
                    {JSON.stringify(selectedStepResult.input || {}, null, 2)}
                  </pre>
                </div>

                {/* Output Payload */}
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Output Result
                  </span>
                  <pre className="font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-white/5 text-emerald-300 overflow-x-auto max-h-52">
                    {JSON.stringify(selectedStepResult.output || {}, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-center text-xs text-slate-400">
                <Clock className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                <p>No execution recorded for this node yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click "Run Workflow" in the top bar to trigger execution.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
