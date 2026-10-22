import React, { useState } from 'react';
import { RelayNode, SUPPORTED_TRANSFORM_OPS, SUPPORTED_CONDITION_OPS } from '@relay/shared';
import { Trash2, X, Sliders, Database, AlertTriangle, Clock } from 'lucide-react';
import clsx from 'clsx';

interface InspectorProps {
  selectedNode: RelayNode | null;
  onUpdateNode: (nodeId: string, updates: Partial<RelayNode['data']>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'results'>('config');

  if (!selectedNode) {
    return (
      <aside className="w-80 border-l border-slate-800 bg-slate-950/90 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center text-slate-500 z-10 select-none">
        <Sliders className="w-8 h-8 mb-3 opacity-40" />
        <h3 className="text-sm font-semibold text-slate-400 mb-1">Node Inspector</h3>
        <p className="text-xs max-w-[200px]">
          Select any node on the canvas to configure parameters or inspect real runtime outputs.
        </p>
      </aside>
    );
  }

  const { data } = selectedNode;
  const config = data.config || {};
  const lastRun = data.lastRun;

  const handleConfigChange = (key: string, value: any) => {
    onUpdateNode(selectedNode.id, {
      ...data,
      config: {
        ...config,
        [key]: value
      }
    });
  };

  const handleLabelChange = (label: string) => {
    onUpdateNode(selectedNode.id, {
      ...data,
      label
    });
  };

  return (
    <aside className="w-84 border-l border-slate-800 bg-slate-950/95 backdrop-blur-md flex flex-col z-10 select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/50">
            {selectedNode.type}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              value={data.label || ''}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-200 hover:bg-slate-900 focus:bg-slate-900 px-1 py-0.5 rounded border border-transparent focus:border-slate-700 outline-none w-48"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDeleteNode(selectedNode.id)}
            className="p-1.5 rounded hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition"
            title="Delete Node"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('config')}
          className={clsx(
            'flex-1 py-2 text-center font-medium border-b-2 transition-colors',
            activeTab === 'config'
              ? 'border-sky-500 text-sky-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
        >
          Configuration
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={clsx(
            'flex-1 py-2 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5',
            activeTab === 'results'
              ? 'border-sky-500 text-sky-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
        >
          <span>Run Output</span>
          {data.status && data.status !== 'idle' && (
            <span
              className={clsx(
                'w-1.5 h-1.5 rounded-full',
                data.status === 'succeeded' ? 'bg-emerald-400' : data.status === 'failed' ? 'bg-rose-400' : 'bg-sky-400'
              )}
            />
          )}
        </button>
      </div>

      {/* Panel Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
        {activeTab === 'config' ? (
          <>
            {/* TRIGGER CONFIG */}
            {selectedNode.type === 'trigger' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Trigger Type
                  </label>
                  <select
                    value={config.triggerType || 'webhook'}
                    onChange={(e) => handleConfigChange('triggerType', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-sky-500"
                  >
                    <option value="webhook">Webhook / API Call</option>
                    <option value="manual">Manual Trigger</option>
                    <option value="schedule">Scheduled Cron</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Initial Payload (JSON)
                  </label>
                  <textarea
                    rows={8}
                    value={
                      typeof config.initialPayload === 'object'
                        ? JSON.stringify(config.initialPayload, null, 2)
                        : config.initialPayload || '{}'
                    }
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleConfigChange('initialPayload', parsed);
                      } catch {
                        // ignore intermediate invalid json typing
                      }
                    }}
                    className="w-full font-mono text-[11px] bg-slate-900 border border-slate-800 rounded p-2 text-sky-300 outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            {/* TRANSFORM CONFIG */}
            {selectedNode.type === 'transform' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Safe Operation
                  </label>
                  <select
                    value={config.operation || 'trim'}
                    onChange={(e) => handleConfigChange('operation', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-sky-500"
                  >
                    {SUPPORTED_TRANSFORM_OPS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Source Field Path
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. message or user.email"
                    value={config.fieldPath || ''}
                    onChange={(e) => handleConfigChange('fieldPath', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Target Output Field
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. cleanedMessage"
                    value={config.targetField || ''}
                    onChange={(e) => handleConfigChange('targetField', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-sky-500"
                  />
                </div>

                {config.operation === 'template' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Template Format
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Alert: {{cleanedMessage}}"
                      value={config.template || ''}
                      onChange={(e) => handleConfigChange('template', e.target.value)}
                      className="w-full font-mono text-[11px] bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 outline-none focus:border-sky-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* CONDITION CONFIG */}
            {selectedNode.type === 'condition' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Evaluated Field Path
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. priority or score"
                    value={config.fieldPath || ''}
                    onChange={(e) => handleConfigChange('fieldPath', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Operator
                  </label>
                  <select
                    value={config.operator || 'equals'}
                    onChange={(e) => handleConfigChange('operator', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-sky-500"
                  >
                    {SUPPORTED_CONDITION_OPS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Target Comparison Value
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. critical or 100"
                    value={config.targetValue ?? ''}
                    onChange={(e) => handleConfigChange('targetValue', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            {/* OUTPUT CONFIG */}
            {selectedNode.type === 'output' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Destination
                  </label>
                  <select
                    value={config.destination || 'response'}
                    onChange={(e) => handleConfigChange('destination', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-sky-500"
                  >
                    <option value="response">API Response Body</option>
                    <option value="webhook">Outbound Webhook</option>
                    <option value="log">Server Audit Log</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Destination Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PagerDuty Channel"
                    value={config.label || ''}
                    onChange={(e) => handleConfigChange('label', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          /* RESULTS TAB */
          <div className="space-y-3">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Current Status:</span>
              <span
                className={clsx(
                  'font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded',
                  data.status === 'succeeded' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  data.status === 'failed' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                  data.status === 'running' ? 'bg-sky-950 text-sky-400 border border-sky-800' :
                  'bg-slate-800 text-slate-400'
                )}
              >
                {data.status || 'idle'}
              </span>
            </div>

            {lastRun?.durationMs !== undefined && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Execution Duration: {lastRun.durationMs}ms</span>
              </div>
            )}

            {lastRun?.error && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300">
                <div className="flex items-center gap-1.5 font-semibold text-[11px] mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Execution Error</span>
                </div>
                <div className="font-mono text-[10px] break-words">{lastRun.error}</div>
              </div>
            )}

            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                Computed Node Output
              </span>
              <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-56">
                {lastRun?.output
                  ? JSON.stringify(lastRun.output, null, 2)
                  : '// No execution output yet. Click "Run Workflow" to execute.'}
              </pre>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                Input Payload
              </span>
              <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-400 overflow-x-auto max-h-40">
                {lastRun?.input ? JSON.stringify(lastRun.input, null, 2) : '// No input data'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
