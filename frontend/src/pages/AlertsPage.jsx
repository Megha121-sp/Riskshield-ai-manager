import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Bell,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { alertsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/formatters';

export default function AlertsPage({ onOpenTransaction }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertsAPI.list(statusFilter || undefined);
      setAlerts(data || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter]);

  const handleUpdateStatus = async (alertId, newStatus) => {
    try {
      await alertsAPI.updateStatus(alertId, newStatus);
      fetchAlerts();
    } catch (err) {
      alert('Failed to update alert status.');
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-950 text-red-400 border-red-800';
      case 'HIGH':
        return 'bg-rose-950 text-rose-400 border-rose-800';
      case 'MEDIUM':
        return 'bg-amber-950 text-amber-400 border-amber-800';
      default:
        return 'bg-blue-950 text-blue-400 border-blue-800';
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Filters & Actions */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN Only</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="DISMISSED">DISMISSED</option>
          </select>
        </div>

        <button
          onClick={fetchAlerts}
          className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Alerts Stream */}
      {loading ? (
        <LoadingSpinner text="Retrieving risk alerts..." size="md" />
      ) : alerts.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <Bell className="w-8 h-8 mx-auto text-slate-600" />
          <h4 className="text-sm font-bold text-white">No Active Alerts</h4>
          <p className="text-xs text-slate-400">All risk alarms have been investigated or resolved.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.alert_id}
              className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card glass-card-hover space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${getSeverityBadge(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{alert.title}</h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      ID: {alert.alert_id} • {formatDate(alert.created_at)}
                    </span>
                  </div>
                </div>

                {/* Status Switcher */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Status:</span>
                  <select
                    value={alert.status}
                    onChange={(e) => handleUpdateStatus(alert.alert_id, e.target.value)}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="DISMISSED">DISMISSED</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {alert.description}
              </p>

              {/* Linked Transactions */}
              {alert.transaction_ids && alert.transaction_ids.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-500 font-medium">Linked Transactions:</span>
                  {alert.transaction_ids.map((tid, i) => (
                    <button
                      key={i}
                      onClick={() => onOpenTransaction(tid)}
                      className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/60 font-mono text-indigo-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <span>{tid}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
