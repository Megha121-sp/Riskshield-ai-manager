import React, { useState } from 'react';
import { X, CheckCircle, ShieldAlert, Ban, AlertTriangle } from 'lucide-react';
import { decisionsAPI } from '../../services/api';

export default function DecisionModal({
  isOpen,
  onClose,
  transaction,
  aiRecommendation,
  onDecisionSubmitted
}) {
  const [selectedAction, setSelectedAction] = useState('HOLD');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !transaction) return null;

  const actionPresets = {
    APPROVE: [
      'Verified customer identity via 2FA and confirmed genuine purchase.',
      'Customer profile and historical spend frequency justify transaction.',
      'Low anomaly score and known trusted device hardware signature.'
    ],
    HOLD: [
      'Placed on temporary hold pending secondary authorization check.',
      'Unusually high velocity burst and abnormal amount deviation.',
      'Unrecognized device signature with non-local IP address.'
    ],
    BLOCK: [
      'Confirmed unauthorized fraudulent takeover attempt.',
      'Multiple failed authentication attempts followed by suspicious burst.',
      'Known syndicate proxy IP and compromised hardware signature.'
    ],
    ESCALATE: [
      'Escalated to Senior Fraud Intelligence Unit for deep entity linking.',
      'Transaction tied to multi-account coordinated fraud ring.',
      'High-severity systemic spike anomaly requiring policy committee review.'
    ]
  };

  const actionButtons = [
    {
      id: 'APPROVE',
      label: 'Approve Payment',
      desc: 'Clear transaction for settlement',
      icon: CheckCircle,
      activeColor: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white',
      inactiveColor: 'bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500/50'
    },
    {
      id: 'HOLD',
      label: 'Place Hold',
      desc: 'Pause for manual review',
      icon: ShieldAlert,
      activeColor: 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white',
      inactiveColor: 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-500/50'
    },
    {
      id: 'BLOCK',
      label: 'Block & Decline',
      desc: 'Decline and mark as confirmed fraud',
      icon: Ban,
      activeColor: 'bg-rose-600 hover:bg-rose-500 border-rose-400 text-white',
      inactiveColor: 'bg-slate-900 border-slate-700 text-slate-300 hover:border-rose-500/50'
    },
    {
      id: 'ESCALATE',
      label: 'Escalate to SIU',
      desc: 'Forward to Special Investigations',
      icon: AlertTriangle,
      activeColor: 'bg-purple-600 hover:bg-purple-500 border-purple-400 text-white',
      inactiveColor: 'bg-slate-900 border-slate-700 text-slate-300 hover:border-purple-500/50'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A reason is required to record a decision audit entry.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        transaction_id: transaction.transaction_id,
        analyst_decision: selectedAction,
        reason: reason.trim()
      };
      await decisionsAPI.submit(payload);
      if (onDecisionSubmitted) {
        onDecisionSubmitted(selectedAction);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit decision.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Analyst Risk Decision</h3>
            <p className="text-xs text-slate-400">
              Transaction: <span className="font-mono text-indigo-400">{transaction.transaction_id}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Recommendation Context */}
        {aiRecommendation && (
          <div className="mt-4 p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl flex items-center justify-between">
            <span className="text-xs text-indigo-300 font-medium">
              AI Agent Recommendation: <strong className="uppercase font-bold text-white ml-1">{aiRecommendation}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSelectedAction(aiRecommendation)}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline"
            >
              Apply AI Recommendation
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Action Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Select Decision Action</label>
            <div className="grid grid-cols-2 gap-2.5">
              {actionButtons.map((btn) => {
                const isSelected = selectedAction === btn.id;
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => {
                      setSelectedAction(btn.id);
                      if (actionPresets[btn.id] && !reason) {
                        setReason(actionPresets[btn.id][0]);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected ? btn.activeColor : btn.inactiveColor
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{btn.label}</span>
                      <Icon className="w-4 h-4 opacity-80" />
                    </div>
                    <span className="text-[11px] opacity-75">{btn.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Quick Reason Presets</label>
            <div className="flex flex-wrap gap-1.5">
              {(actionPresets[selectedAction] || []).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-left"
                >
                  {preset.slice(0, 45)}...
                </button>
              ))}
            </div>
          </div>

          {/* Reason Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mandatory Analyst Justification & Reason *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter detailed risk justification to be recorded in the immutable audit trail..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Recording Audit...' : 'Confirm Decision & Log Audit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
