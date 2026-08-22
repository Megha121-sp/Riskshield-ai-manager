import React, { useEffect, useState } from 'react';
import { X, Zap, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { demoAPI } from '../../services/api';
import RiskBadge from './RiskBadge';

export default function ScenarioModal({ isOpen, onClose, onSelectScenario }) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      demoAPI.getScenarios()
        .then(data => setScenarios(data))
        .catch(() => setScenarios([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Predefined Risk Scenarios</h3>
              <p className="text-xs text-slate-400">
                1-Click end-to-end demonstration scenarios for fraud detection, SHAP explanations & AI agent investigations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading test scenarios...</div>
          ) : (
            scenarios.map((sc) => (
              <div
                key={sc.id}
                className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl hover:border-indigo-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800/60 text-indigo-300 font-mono text-[11px] font-bold">
                      Scenario #{sc.scenario_number}
                    </span>
                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {sc.title}
                    </h4>
                    <RiskBadge level={sc.expected_risk} showScore={false} size="sm" />
                  </div>

                  <p className="text-xs text-slate-300">
                    {sc.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(sc.key_signals || []).map((sig, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectScenario(sc.id);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <span>Test & Investigate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
