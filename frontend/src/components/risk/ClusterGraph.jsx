import React, { useState } from 'react';
import { Smartphone, Globe, User, ShieldAlert, Layers } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function ClusterGraph({ clusters = [] }) {
  const [activeClusterIndex, setActiveClusterIndex] = useState(0);

  if (!clusters || clusters.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/40 border border-slate-800 rounded-2xl">
        <Layers className="w-8 h-8 mx-auto text-slate-600 mb-2" />
        No active suspicious clusters detected in recent transaction window.
      </div>
    );
  }

  const activeCluster = clusters[activeClusterIndex] || clusters[0];

  return (
    <div className="space-y-6">
      {/* Cluster Selector Tabs */}
      <div className="flex flex-wrap gap-2 pb-2">
        {clusters.map((c, idx) => (
          <button
            key={idx}
            onClick={() => setActiveClusterIndex(idx)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
              activeClusterIndex === idx
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{c.cluster_id}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
              c.risk_level === 'CRITICAL' ? 'bg-red-950 text-red-400' : 'bg-rose-950 text-rose-400'
            }`}>
              {c.risk_level}
            </span>
          </button>
        ))}
      </div>

      {/* Cluster Details & Interactive Network Topology */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <span>{activeCluster.cluster_id}</span>
              <span className="text-xs font-normal text-slate-400">({activeCluster.cluster_type})</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Detected across <strong className="text-white">{activeCluster.affected_users?.length || 0}</strong> accounts & <strong className="text-white">{activeCluster.affected_transactions?.length || 0}</strong> transactions.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase font-semibold">Estimated Amount at Risk</span>
            <div className="text-xl font-bold font-mono text-rose-400">
              {formatCurrency(activeCluster.estimated_amount_at_risk)}
            </div>
          </div>
        </div>

        {/* Network Diagram (Visual Graph Representation) */}
        <div className="relative p-6 bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 mb-4 flex items-center justify-between">
            <span>Entity Relationship Topology</span>
            <span className="text-[11px] text-indigo-400 font-mono">Real-time graph analysis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Column 1: Customer Accounts */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Affected Accounts</span>
              {(activeCluster.affected_users || []).map((u, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs font-mono text-slate-200">
                  <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{u}</span>
                </div>
              ))}
            </div>

            {/* Column 2: Shared Pivot Hardware / IPs */}
            <div className="space-y-3">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider text-center block">Shared Infrastructure</span>
              {(activeCluster.shared_devices || []).map((dev, i) => (
                <div key={i} className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/60 flex items-center gap-2.5 text-xs text-rose-300 font-mono shadow-sm">
                  <Smartphone className="w-4 h-4 text-rose-400 shrink-0" />
                  <div className="truncate">
                    <div className="text-[10px] uppercase font-bold text-rose-400">Shared Device Hardware</div>
                    <span className="font-semibold">{dev}</span>
                  </div>
                </div>
              ))}
              {(activeCluster.shared_ips || []).map((ip, i) => (
                <div key={i} className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 flex items-center gap-2.5 text-xs text-amber-300 font-mono shadow-sm">
                  <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="truncate">
                    <div className="text-[10px] uppercase font-bold text-amber-400">Shared Proxy / Bot IP</div>
                    <span className="font-semibold">{ip}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Column 3: Impacted Transactions */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Linked Transactions</span>
              {(activeCluster.affected_transactions || []).slice(0, 5).map((tid, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
                  <span className="truncate text-indigo-400">{tid}</span>
                  <span className="text-[10px] text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950/60">HIGH RISK</span>
                </div>
              ))}
              {(activeCluster.affected_transactions?.length || 0) > 5 && (
                <div className="text-[11px] text-center text-slate-500 font-mono">
                  + {activeCluster.affected_transactions.length - 5} additional transactions
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
