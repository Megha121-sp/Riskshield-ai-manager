import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, CheckCircle, AlertTriangle, XCircle, RefreshCw, Server, Database, Cpu, Bot, Lock } from 'lucide-react';
import { systemAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';

export default function SystemHealthModal({ isOpen, onClose }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await systemAPI.getHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderBadge = (status) => {
    if (status === 'HEALTHY') {
      return (
        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> HEALTHY
        </span>
      );
    } else if (status === 'DEGRADED') {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-mono font-bold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> DEGRADED
        </span>
      );
    } else {
      return (
        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-mono font-bold flex items-center gap-1">
          <XCircle className="w-3 h-3" /> ERROR
        </span>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">System Diagnostic Health</h3>
                {health && renderBadge(health.overall_status)}
              </div>
              <p className="text-xs text-slate-400">Live Infrastructure & AI/ML Service Connectivity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {loading ? (
            <LoadingSpinner text="Querying infrastructure health checks..." size="md" />
          ) : !health ? (
            <div className="p-8 text-center text-slate-400">Unable to retrieve system health diagnostics.</div>
          ) : (
            <>
              <div className="space-y-2.5">
                {/* API Gateway */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <div>
                      <h4 className="font-bold text-white">FastAPI Gateway</h4>
                      <p className="text-[11px] text-slate-400">Response latency: {health.components.api_gateway.latency_ms} ms</p>
                    </div>
                  </div>
                  {renderBadge(health.components.api_gateway.status)}
                </div>

                {/* MongoDB */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-white">MongoDB Persistence Store</h4>
                      <p className="text-[11px] text-slate-400">Live indexed documents: {health.components.mongodb_persistence.record_count.toLocaleString()}</p>
                    </div>
                  </div>
                  {renderBadge(health.components.mongodb_persistence.status)}
                </div>

                {/* ML Engine */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <div>
                      <h4 className="font-bold text-white">ML Risk Inference Engine</h4>
                      <p className="text-[11px] text-slate-400">XGBoost & Isolation Forest | 27 Features Active</p>
                    </div>
                  </div>
                  {renderBadge(health.components.ml_risk_models.status)}
                </div>

                {/* AI Agent */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bot className="w-4 h-4 text-indigo-400" />
                    <div>
                      <h4 className="font-bold text-white">AI Investigation Agent</h4>
                      <p className="text-[11px] text-slate-400">Mode: {health.components.ai_investigation_agent.mode}</p>
                    </div>
                  </div>
                  {renderBadge(health.components.ai_investigation_agent.status)}
                </div>

                {/* Audit Ledger */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-purple-400" />
                    <div>
                      <h4 className="font-bold text-white">Cryptographic Audit Ledger</h4>
                      <p className="text-[11px] text-slate-400">Recorded events: {health.components.audit_ledger.total_events}</p>
                    </div>
                  </div>
                  {renderBadge(health.components.audit_ledger.status)}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500 border-t border-slate-800">
                <span>Last telemetry check: {formatDate(health.timestamp)}</span>
                <button
                  onClick={fetchHealth}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Re-check
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
