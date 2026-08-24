import React, { useEffect, useState } from 'react';
import { Bell, X, ShieldAlert, Activity, Network, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { systemAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';

export default function NotificationCenter({ isOpen, onClose, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const data = await systemAPI.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'SPIKE':
        return <Activity className="w-4 h-4 text-rose-400" />;
      case 'CLUSTER':
        return <Network className="w-4 h-4 text-amber-400" />;
      case 'QUEUE':
        return <ShieldAlert className="w-4 h-4 text-indigo-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="absolute right-0 top-14 w-96 max-h-[80vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Operational Attention Stream</h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading operational alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No pending notifications. System nominal.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (onNavigate) onNavigate(n.target_url);
                onClose();
              }}
              className="p-3 bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800/80 hover:border-indigo-500/50 rounded-xl cursor-pointer transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getIcon(n.type)}
                  <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {n.title}
                  </span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                  n.severity === 'CRITICAL'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : n.severity === 'HIGH'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {n.severity}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {n.message}
              </p>
              {n.timestamp && (
                <span className="text-[10px] text-slate-500 font-mono block pt-0.5">
                  {formatDate(n.timestamp)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
