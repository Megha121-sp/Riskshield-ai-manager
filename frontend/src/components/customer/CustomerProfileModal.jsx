import React, { useEffect, useState } from 'react';
import { User, X, ShieldAlert, ShieldCheck, Clock, Layers, Smartphone, Globe, ArrowRight } from 'lucide-react';
import { customersAPI } from '../../services/api';
import RiskBadge from '../common/RiskBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function CustomerProfileModal({ customerId, isOpen, onClose, onOpenTransaction }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && customerId) {
      setLoading(true);
      customersAPI.getProfile(customerId)
        .then((data) => setProfile(data))
        .catch((err) => console.error('Failed to load customer profile:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">{customerId}</h3>
                {profile && (
                  <RiskBadge level={profile.risk_level} score={profile.current_risk_score} size="sm" />
                )}
              </div>
              <p className="text-xs text-slate-400">Customer Risk Profile & Activity Timeline</p>
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {loading ? (
            <LoadingSpinner text={`Aggregating risk profile for ${customerId}...`} size="md" />
          ) : !profile ? (
            <div className="p-8 text-center text-slate-400">Customer profile not found.</div>
          ) : (
            <>
              {/* Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Account Tenure</span>
                  <div className="text-base font-bold font-mono text-white">{profile.account_age_days} days</div>
                </div>
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Txn Volume</span>
                  <div className="text-base font-bold font-mono text-white">{formatCurrency(profile.total_transaction_volume)}</div>
                </div>
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Avg / Max Spend</span>
                  <div className="text-base font-bold font-mono text-white">
                    {formatCurrency(profile.average_transaction)} / {formatCurrency(profile.largest_transaction)}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Fraud Incidents</span>
                  <div className={`text-base font-bold font-mono ${profile.fraud_transactions > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {profile.fraud_transactions} flagged / {profile.total_transactions} total
                  </div>
                </div>
              </div>

              {/* Hardware, Geolocation & Merchants */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> Linked Hardware Devices ({profile.devices.length})
                  </span>
                  <div className="space-y-1">
                    {profile.devices.map((d, i) => (
                      <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-slate-200 truncate">
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" /> Geolocation & IP History
                  </span>
                  <div className="space-y-1">
                    {profile.ip_addresses.slice(0, 3).map((ip, i) => (
                      <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-slate-200 truncate">
                        {ip} ({profile.countries.join(', ') || 'IN'})
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" /> Frequent Merchant Sectors
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {profile.merchants.map((m, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Customer Timeline */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Chronological Activity Timeline
                </span>
                <div className="space-y-2.5 relative pl-4 border-l-2 border-slate-800">
                  {(profile.timeline || []).map((ev, i) => (
                    <div key={i} className="relative group">
                      <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full ${
                        ev.severity === 'CRITICAL' ? 'bg-rose-500 ring-4 ring-rose-950' :
                        ev.severity === 'HIGH' ? 'bg-amber-500 ring-4 ring-amber-950' :
                        'bg-indigo-500 ring-4 ring-indigo-950'
                      }`} />
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{ev.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{formatDate(ev.timestamp)}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{ev.description}</p>
                        </div>
                        {ev.transaction_id && onOpenTransaction && (
                          <button
                            onClick={() => {
                              onOpenTransaction(ev.transaction_id);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-bold hover:bg-indigo-900 transition-colors flex items-center gap-1 shrink-0"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
