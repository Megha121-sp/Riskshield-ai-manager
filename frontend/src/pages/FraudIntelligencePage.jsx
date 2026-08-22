import React, { useEffect, useState } from 'react';
import {
  Network,
  Activity,
  Smartphone,
  Globe,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Users
} from 'lucide-react';
import { fraudAPI } from '../services/api';
import ClusterGraph from '../components/risk/ClusterGraph';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency, formatPercent, formatDate } from '../utils/formatters';

export default function FraudIntelligencePage() {
  const [clusters, setClusters] = useState([]);
  const [spikes, setSpikes] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clusters');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, s, d] = await Promise.all([
        fraudAPI.getClusters(),
        fraudAPI.getSpikes(),
        fraudAPI.getDevices()
      ]);
      setClusters(c || []);
      setSpikes(s || []);
      setDevices(d || []);
    } catch (err) {
      console.error('Failed to load fraud intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Running fraud cluster network extraction & spike detection..." size="lg" />;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Tab Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('clusters')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'clusters'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Fraud Rings & Clusters ({clusters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('spikes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'spikes'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Fraud Spikes & Surges ({spikes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'devices'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Multi-Account Devices ({devices.length})</span>
          </button>
        </div>

        <button
          onClick={fetchData}
          className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Intelligence</span>
        </button>
      </div>

      {/* Tab 1: Clusters View */}
      {activeTab === 'clusters' && (
        <div className="space-y-6">
          <ClusterGraph clusters={clusters} />
        </div>
      )}

      {/* Tab 2: Spikes View */}
      {activeTab === 'spikes' && (
        <div className="space-y-4">
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card">
            <h3 className="text-sm font-bold text-white mb-1">Time-Window Rolling Spike Detection</h3>
            <p className="text-xs text-slate-400 mb-4">
              Real-time anomaly monitoring comparing current fraud rate against historical baseline (4.5%).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {spikes.map((spike) => (
                <div
                  key={spike.spike_id}
                  className="p-4 bg-slate-950/80 border border-rose-900/60 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">{spike.time_window}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-bold uppercase font-mono">
                      {spike.severity} SPIKE
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-2xl font-bold font-mono text-rose-400">
                      {formatPercent(spike.fraud_rate * 100)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Baseline: <strong className="text-slate-300">{formatPercent(spike.baseline_fraud_rate * 100)}</strong> ({((spike.fraud_rate / spike.baseline_fraud_rate) * 100).toFixed(0)}% surge)
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Window Volume:</span>
                      <span className="font-mono">{spike.transaction_volume} txns</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fraud Flagged:</span>
                      <span className="font-mono text-rose-400 font-bold">{spike.fraud_count} txns</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Amount at Risk:</span>
                      <span className="font-mono text-rose-400 font-bold">{formatCurrency(spike.amount_at_risk)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Devices View */}
      {activeTab === 'devices' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl glass-card overflow-hidden">
          <div className="p-5 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Suspicious Hardware Device Inventory</h3>
            <p className="text-xs text-slate-400">
              Hardware devices exhibiting multi-account linkages, bot behavior, or elevated fraud incidence.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">Device ID</th>
                  <th className="py-3 px-4">Linked Accounts</th>
                  <th className="py-3 px-4">Associated Accounts</th>
                  <th className="py-3 px-4">Txn Count</th>
                  <th className="py-3 px-4">Fraud Count</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Risk Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {devices.map((d) => (
                  <tr key={d.device_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                      {d.device_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {d.distinct_accounts_count} accounts
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300 truncate max-w-[200px]">
                      {d.accounts?.join(', ')}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {d.transaction_count}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-rose-400 font-bold">
                      {d.fraud_count}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white font-bold">
                      {formatCurrency(d.total_amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        d.risk_level === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {d.risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
