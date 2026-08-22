import React from 'react';
import { formatDate } from '../../utils/formatters';
import { ShieldCheck, Cpu, UserCheck, Bell, RefreshCw } from 'lucide-react';

export default function AuditTimeline({ logs = [] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-slate-400 text-xs">
        No audit events recorded for this transaction yet.
      </div>
    );
  }

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'TRANSACTION_INGESTED':
      case 'RISK_SCORE_GENERATED':
        return <Cpu className="w-4 h-4 text-indigo-400" />;
      case 'AI_INVESTIGATION_COMPLETED':
        return <ShieldCheck className="w-4 h-4 text-purple-400" />;
      case 'HUMAN_DECISION_RECORDED':
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'ALERT_STATUS_UPDATED':
      case 'ALERT_TRIGGERED':
        return <Bell className="w-4 h-4 text-amber-400" />;
      default:
        return <RefreshCw className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {logs.map((log, idx) => (
        <div key={idx} className="relative group">
          {/* Node Icon */}
          <div className="absolute -left-6 top-0.5 p-1 rounded-full bg-slate-900 border border-slate-700 group-hover:border-indigo-500 transition-colors">
            {getEventIcon(log.event_type)}
          </div>

          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200">
                {log.event_type?.replace(/_/g, ' ')}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {formatDate(log.timestamp)}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              {log.action}
            </p>

            <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
              <span>Actor: <strong className="text-indigo-400">{log.actor}</strong></span>
              <span>Model: <strong className="text-slate-300">{log.model_version || 'xgboost_v1.0'}</strong></span>
              <span className="text-slate-500">ID: {log.event_id}</span>
            </div>

            {log.details && Object.keys(log.details).length > 0 && (
              <div className="mt-2 p-2 rounded bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono text-slate-400 overflow-x-auto">
                <pre>{JSON.stringify(log.details, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
