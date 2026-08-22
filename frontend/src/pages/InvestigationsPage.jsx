import React, { useEffect, useState } from 'react';
import {
  Bot,
  Search,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { investigationsAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, formatPercent } from '../utils/formatters';

export default function InvestigationsPage({ onOpenTransaction }) {
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchInvestigations = async () => {
    setLoading(true);
    try {
      const list = await investigationsAPI.list();
      setInvestigations(list || []);
    } catch (err) {
      console.error('Failed to load investigations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, []);

  const filtered = investigations.filter((inv) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      inv.transaction_id?.toLowerCase().includes(s) ||
      inv.investigation_id?.toLowerCase().includes(s) ||
      inv.recommended_action?.toLowerCase().includes(s) ||
      inv.summary?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search investigations by ID, transaction, action or finding..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={fetchInvestigations}
          className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Investigations List */}
      {loading ? (
        <LoadingSpinner text="Retrieving AI investigation dossiers..." size="md" />
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <Bot className="w-8 h-8 mx-auto text-indigo-400 opacity-60" />
          <h4 className="text-sm font-bold text-white">No Investigations Found</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Open any suspicious transaction from the Transactions page or launch a demo scenario to generate deep AI investigation dossiers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((inv) => (
            <div
              key={inv.investigation_id}
              className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card glass-card-hover space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">{inv.investigation_id}</span>
                      <span className="text-slate-600">•</span>
                      <button
                        onClick={() => onOpenTransaction(inv.transaction_id)}
                        className="font-mono text-xs font-bold text-indigo-400 hover:underline"
                      >
                        {inv.transaction_id}
                      </button>
                      <RiskBadge
                        level={inv.risk_score > 70 ? 'HIGH' : inv.risk_score > 30 ? 'MEDIUM' : 'LOW'}
                        score={inv.risk_score}
                        size="sm"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Generated at {formatDate(inv.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Recommendation</span>
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                      inv.recommended_action === 'HOLD' || inv.recommended_action === 'BLOCK'
                        ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                        : inv.recommended_action === 'REVIEW'
                        ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                        : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                    }`}>
                      {inv.recommended_action} ({formatPercent(inv.confidence * 100)})
                    </span>
                  </div>

                  <button
                    onClick={() => onOpenTransaction(inv.transaction_id)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span>View Dossier</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                {inv.summary}
              </p>

              {/* Key Findings List */}
              {inv.key_findings && inv.key_findings.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Key Evidence Findings</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {inv.key_findings.slice(0, 4).map((f, i) => (
                      <div key={i} className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/40 text-[11px] text-slate-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
