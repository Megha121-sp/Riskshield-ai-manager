import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Bot,
  User,
  Smartphone,
  Globe,
  Clock,
  Layers,
  CheckCircle,
  FileText,
  Sparkles,
  RefreshCw,
  AlertOctagon
} from 'lucide-react';
import { transactionsAPI, investigationsAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';
import ScoreGauge from '../components/risk/ScoreGauge';
import ShapWaterfall from '../components/risk/ShapWaterfall';
import DecisionModal from '../components/risk/DecisionModal';
import AuditTimeline from '../components/risk/AuditTimeline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';

export default function TransactionDetailPage({ transactionId, onBack, onOpenTransaction }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await transactionsAPI.get(transactionId);
      setData(res);
    } catch (err) {
      console.error('Failed to load transaction detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transactionId) {
      fetchDetail();
    }
  }, [transactionId]);

  const handleRunInvestigation = async () => {
    setInvestigating(true);
    try {
      const inv = await investigationsAPI.run(transactionId);
      setData(prev => ({
        ...prev,
        investigation: inv
      }));
      const updated = await transactionsAPI.get(transactionId);
      setData(updated);
    } catch (err) {
      alert('Investigation generation failed. Please try again.');
    } finally {
      setInvestigating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text={`Analyzing transaction ${transactionId}...`} size="lg" />;
  }

  if (!data || !data.transaction) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
        <p>Transaction not found.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
        >
          Back to Queue
        </button>
      </div>
    );
  }

  const { transaction: tx, risk_score: score, related_transactions: related, audit_logs: logs, investigation: inv } = data;

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white font-mono">{tx.transaction_id}</h2>
              <RiskBadge level={score?.risk_level} score={score?.final_risk_score} />
              <StatusBadge status={tx.status} />
            </div>
            <p className="text-xs text-slate-400">
              Customer: <span className="text-indigo-400 font-mono">{tx.customer_id}</span> • Authorized at {formatDate(tx.timestamp)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDecisionModalOpen(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Make Analyst Decision</span>
          </button>
        </div>
      </div>

      {/* Grid: Left Risk Overview + Right Transaction Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Risk Gauge & Sub-scores */}
        <div className="space-y-6">
          <ScoreGauge
            score={score?.final_risk_score}
            level={score?.risk_level}
            subScores={{
              fraud_probability: score?.fraud_probability,
              anomaly_score: score?.anomaly_score,
              velocity_score: score?.velocity_score,
              behavioural_score: score?.behavioural_score,
              device_score: score?.device_score
            }}
          />

          {/* Quick Customer Profile Card */}
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              Customer Profile
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Customer ID</span>
                <span className="font-mono font-semibold text-slate-200">{tx.customer_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Account Age</span>
                <span className="font-mono text-slate-200">{tx.account_age_days || 60} days</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Historical Avg Spend</span>
                <span className="font-mono text-slate-200">{formatCurrency(tx.average_transaction_amount || 1500)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Prior Transactions</span>
                <span className="font-mono text-slate-200">{tx.previous_transaction_count || 12} successful</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Details, SHAP Waterfall, AI Investigator */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transaction Metadata Grid */}
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Payment Execution Metadata
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Transaction Amount</span>
                <span className="text-base font-bold font-mono text-white">{formatCurrency(tx.amount)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Payment Channel</span>
                <span className="font-semibold text-slate-200">{tx.payment_method}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Merchant ID / Sector</span>
                <span className="font-semibold text-slate-200 truncate block">{tx.merchant_id} ({tx.merchant_category})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Device Hardware ID</span>
                <span className="font-mono text-slate-300 truncate block">{tx.device_id}</span>
                {tx.is_new_device && (
                  <span className="text-[10px] text-amber-400 font-bold">Unrecognized Device</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">IP Address & Country</span>
                <span className="font-mono text-slate-300 block">{tx.ip_address} ({tx.country || 'IN'})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Velocity (10m / 1h)</span>
                <span className="font-mono text-slate-300 block">{tx.transactions_last_10min || 1} txns / {tx.transactions_last_1hour || 1} txns</span>
              </div>
            </div>
          </div>

          {/* SHAP Factor Breakdown */}
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  SHAP Explainability & Risk Attribution
                </h4>
                <p className="text-xs text-slate-400">Local feature contribution magnitude towards estimated fraud risk</p>
              </div>
            </div>
            <ShapWaterfall factors={score?.top_risk_factors || []} />
          </div>

          {/* AI Investigation Agent Panel */}
          <div className="p-6 bg-slate-900/90 border border-indigo-900/60 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    AI Investigation Agent
                    {inv?.is_fallback && (
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 text-[10px] font-mono border border-amber-800/40">
                        Demo Rule Mode
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">Automated multi-vector evidence synthesis & policy recommendation</p>
                </div>
              </div>

              <button
                onClick={handleRunInvestigation}
                disabled={investigating}
                className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-200 bg-indigo-900/60 border border-indigo-700 hover:bg-indigo-800/60 transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${investigating ? 'animate-spin' : ''}`} />
                <span>{investigating ? 'Investigating...' : (inv ? 'Re-run AI Analysis' : 'Run AI Investigation')}</span>
              </button>
            </div>

            {inv ? (
              <div className="space-y-4 text-xs">
                {/* Executive Summary */}
                <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">Executive Assessment</span>
                  <p className="text-slate-200 leading-relaxed">{inv.summary}</p>
                </div>

                {/* Key Findings */}
                {inv.key_findings && inv.key_findings.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Key Investigation Findings</span>
                    <div className="space-y-1.5">
                      {inv.key_findings.map((f, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60 flex items-start gap-2 text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supporting & Conflicting Evidence Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" /> Supporting Risk Evidence
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {(inv.supporting_evidence || []).map((ev, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px]">
                          <span className="text-rose-400">•</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Conflicting / Legitimate Signals
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {(inv.conflicting_evidence || []).map((ev, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px]">
                          <span className="text-emerald-400">•</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendation Footer Banner */}
                <div className="p-4 rounded-xl bg-indigo-950/50 border border-indigo-800/60 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">AI Recommended Action</span>
                    <div className="text-sm font-extrabold uppercase text-indigo-300 font-mono">
                      {inv.recommended_action}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Confidence Score</span>
                    <div className="text-sm font-bold text-white font-mono">
                      {formatPercent(inv.confidence * 100)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Human Review Required</span>
                    <div className="text-sm font-bold text-amber-400 font-mono">
                      {inv.requires_human_review ? 'YES (MANDATORY)' : 'NO'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-slate-800/60">
                Click "Run AI Investigation" above to synthesize live ML features, network links, and SHAP factors into an actionable risk report.
              </div>
            )}
          </div>

          {/* Related Transactions Table */}
          {related && related.length > 0 && (
            <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Related Transactions (Same Customer or Device)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                      <th className="py-2 px-3">Transaction ID</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {related.map((r) => (
                      <tr
                        key={r.transaction_id}
                        onClick={() => onOpenTransaction(r.transaction_id)}
                        className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono text-indigo-400 font-bold">{r.transaction_id}</td>
                        <td className="py-2.5 px-3 font-mono text-white font-bold">{formatCurrency(r.amount)}</td>
                        <td className="py-2.5 px-3 text-slate-300">{r.payment_method}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{formatDate(r.timestamp)}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Timeline */}
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Immutable Audit Trail
            </h4>
            <AuditTimeline logs={logs || []} />
          </div>
        </div>
      </div>

      {/* Human Decision Modal */}
      <DecisionModal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        transaction={tx}
        aiRecommendation={inv?.recommended_action}
        onDecisionSubmitted={(action) => {
          fetchDetail();
        }}
      />
    </div>
  );
}
