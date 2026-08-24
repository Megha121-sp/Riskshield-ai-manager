import React, { useEffect, useState } from 'react';
import { Smartphone, X, ShieldAlert, Users, Layers, Globe, Clock, ArrowRight, Ban, ShieldCheck } from 'lucide-react';
import { fraudAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function DeviceInvestigationModal({ deviceId, isOpen, onClose, onOpenTransaction, onOpenCustomer }) {
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && deviceId) {
      setLoading(true);
      fraudAPI.getDeviceDetail(deviceId)
        .then((data) => setDevice(data))
        .catch((err) => console.error('Failed to load device details:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, deviceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">{deviceId}</h3>
                {device && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    device.risk_level === 'CRITICAL'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : device.risk_level === 'HIGH'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}>
                    {device.risk_level} RISK
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Forensic Hardware Signature & Multi-Account Linkage</p>
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
            <LoadingSpinner text={`Analyzing hardware telemetry for ${deviceId}...`} size="md" />
          ) : !device ? (
            <div className="p-8 text-center text-slate-400">Device profile not found.</div>
          ) : (
            <>
              {/* Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Linked Accounts</span>
                  <div className={`text-base font-bold font-mono ${device.distinct_accounts_count >= 2 ? 'text-rose-400' : 'text-white'}`}>
                    {device.distinct_accounts_count} accounts
                  </div>
                </div>
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Txns / Fraud</span>
                  <div className="text-base font-bold font-mono text-white">
                    {device.transaction_count} txns ({device.fraud_count} fraud)
                  </div>
                </div>
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Amount at Risk</span>
                  <div className="text-base font-bold font-mono text-rose-400">
                    {formatCurrency(device.amount_at_risk)}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Recommended Action</span>
                  <div className="text-sm font-bold font-mono text-indigo-300 uppercase">
                    {device.recommended_action}
                  </div>
                </div>
              </div>

              {/* Linked Accounts List */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" /> Linked Customer Accounts ({device.accounts.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {device.accounts.map((acc, i) => (
                    <div key={i} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                      <span className="font-mono text-white text-xs font-semibold">{acc}</span>
                      {onOpenCustomer && (
                        <button
                          onClick={() => {
                            onOpenCustomer(acc);
                            onClose();
                          }}
                          className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-bold hover:bg-indigo-900 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Profile</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Associated Transactions */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> Recent Transactions via Device
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                        <th className="py-2 px-3">Transaction ID</th>
                        <th className="py-2 px-3">Customer</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {device.transactions.map((tx) => (
                        <tr key={tx.transaction_id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-2 px-3 font-mono text-indigo-400 font-bold">{tx.transaction_id}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">{tx.customer_id}</td>
                          <td className="py-2 px-3 font-mono text-white font-bold">{formatCurrency(tx.amount)}</td>
                          <td className="py-2 px-3 font-mono text-slate-400">{tx.status}</td>
                          <td className="py-2 px-3 text-right">
                            {onOpenTransaction && (
                              <button
                                onClick={() => {
                                  onOpenTransaction(tx.transaction_id);
                                  onClose();
                                }}
                                className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-colors"
                              >
                                Inspect
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
