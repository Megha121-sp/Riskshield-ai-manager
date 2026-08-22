import React, { useEffect, useState } from 'react';
import {
  FileClock,
  Search,
  Filter,
  RefreshCw,
  Cpu,
  UserCheck,
  ShieldCheck,
  Bell,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { auditAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/formatters';

export default function AuditLogsPage({ onOpenTransaction }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [actorFilter, setActorFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [skip, setSkip] = useState(0);
  const limit = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditAPI.list({
        actor: actorFilter || undefined,
        event_type: eventTypeFilter || undefined,
        limit,
        skip
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [skip, eventTypeFilter]);

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
        return <FileClock className="w-4 h-4 text-slate-400" />;
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <div className="space-y-6 pb-16">
      {/* Search & Filter Header */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <select
            value={eventTypeFilter}
            onChange={(e) => { setEventTypeFilter(e.target.value); setSkip(0); }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="">All Audit Event Types</option>
            <option value="TRANSACTION_INGESTED">TRANSACTION_INGESTED</option>
            <option value="AI_INVESTIGATION_COMPLETED">AI_INVESTIGATION_COMPLETED</option>
            <option value="HUMAN_DECISION_RECORDED">HUMAN_DECISION_RECORDED</option>
            <option value="ALERT_STATUS_UPDATED">ALERT_STATUS_UPDATED</option>
            <option value="DEMO_DATA_SEEDED">DEMO_DATA_SEEDED</option>
          </select>

          <input
            type="text"
            placeholder="Filter by Actor..."
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl glass-card overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Retrieving immutable audit records..." size="md" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Action Summary</th>
                  <th className="py-3 px-4">Model Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.event_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400 text-[11px]">
                        {log.event_id}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 font-bold font-mono text-[11px] text-slate-200">
                          {getEventIcon(log.event_type)}
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-indigo-400 font-semibold">
                        {log.actor}
                      </td>
                      <td className="py-3.5 px-4">
                        {log.transaction_id ? (
                          <button
                            onClick={() => onOpenTransaction(log.transaction_id)}
                            className="font-mono text-indigo-400 hover:underline font-bold"
                          >
                            {log.transaction_id}
                          </button>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {log.model_version || 'xgboost_v1.0'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Total Logged Events: <strong className="text-white font-mono">{total}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSkip(Math.max(0, skip - limit))}
              disabled={skip === 0}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2">Page {currentPage} of {totalPages || 1}</span>
            <button
              onClick={() => setSkip(skip + limit)}
              disabled={skip + limit >= total}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
