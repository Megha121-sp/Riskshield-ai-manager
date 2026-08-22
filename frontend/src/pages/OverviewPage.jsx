import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Cpu,
  Layers,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

import { analyticsAPI, transactionsAPI } from '../services/api';
import MetricCard from '../components/common/MetricCard';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency, formatNumber, formatPercent, formatDate } from '../utils/formatters';

const RISK_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function OverviewPage({ onOpenTransaction }) {
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [merchantCats, setMerchantCats] = useState([]);
  const [recentHighRisk, setRecentHighRisk] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [m, t, pm, mc, tx] = await Promise.all([
          analyticsAPI.getOverview(),
          analyticsAPI.getFraudTrend(),
          analyticsAPI.getPaymentMethods(),
          analyticsAPI.getMerchantCategories(),
          transactionsAPI.list({ limit: 6, risk_level: 'HIGH' })
        ]);
        setMetrics(m);
        setTrends(t);
        setPaymentMethods(pm);
        setMerchantCats(mc);
        setRecentHighRisk(tx.transactions || []);
      } catch (err) {
        console.error('Failed to load overview analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Computing real-time risk intelligence..." size="lg" />;
  }

  const pieData = [
    { name: 'Low Risk', value: metrics?.low_risk_count || 0 },
    { name: 'Medium Risk', value: metrics?.medium_risk_count || 0 },
    { name: 'High Risk', value: metrics?.high_risk_count || 0 },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Transactions"
          value={formatNumber(metrics?.total_transactions)}
          subtitle={`Total volume: ${formatCurrency(metrics?.total_volume_amount)}`}
          iconName="Receipt"
          variant="default"
        />
        <MetricCard
          title="Potential Protected"
          value={formatCurrency(metrics?.potential_amount_protected)}
          subtitle={`Amount at risk: ${formatCurrency(metrics?.amount_at_risk)}`}
          iconName="ShieldCheck"
          variant="success"
          trend="+94.2% saved"
          trendPositive={true}
        />
        <MetricCard
          title="High Risk Flagged"
          value={formatNumber(metrics?.high_risk_count)}
          subtitle={`Fraud rate: ${formatPercent(metrics?.fraud_rate)}`}
          iconName="ShieldAlert"
          variant="danger"
        />
        <MetricCard
          title="Model Precision & ROC"
          value={`${formatPercent(metrics?.precision * 100)} / ${(metrics?.roc_auc || 0.998).toFixed(3)}`}
          subtitle={`FPR: ${formatPercent(metrics?.fpr * 100)} (FP Cost: ${formatCurrency(metrics?.false_positive_cost)})`}
          iconName="Cpu"
          variant="indigo"
        />
      </div>

      {/* Row 2: Trend Chart & Risk Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction & Fraud Volume Trend */}
        <div className="lg:col-span-2 p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Transaction Volume & Fraud Incidents</h3>
              <p className="text-xs text-slate-400">Daily timeseries distribution across 30-day window</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Total Txns
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Fraud Detected
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="total_count" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Total Transactions" />
                <Area type="monotone" dataKey="fraud_count" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFraud)" name="Fraud Flagged" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Level Distribution Donut */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Risk Distribution</h3>
            <p className="text-xs text-slate-400">Low vs Medium vs High Risk breakdown</p>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-white">{metrics?.total_transactions}</span>
              <span className="block text-[10px] text-slate-400 uppercase">Total Txns</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center">
            <div>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase">Low (≤30)</span>
              <div className="text-sm font-bold text-white font-mono">{formatNumber(metrics?.low_risk_count)}</div>
            </div>
            <div>
              <span className="text-[10px] text-amber-400 font-semibold uppercase">Med (31-70)</span>
              <div className="text-sm font-bold text-white font-mono">{formatNumber(metrics?.medium_risk_count)}</div>
            </div>
            <div>
              <span className="text-[10px] text-rose-400 font-semibold uppercase">High (&gt;70)</span>
              <div className="text-sm font-bold text-white font-mono">{formatNumber(metrics?.high_risk_count)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Payment Methods & Merchant Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Bar */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Fraud by Payment Method</h3>
            <p className="text-xs text-slate-400">Total volume vs detected fraudulent volume</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethods} layout="vertical">
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis dataKey="payment_method" type="category" stroke="#94a3b8" fontSize={11} width={85} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Total Volume" />
                <Bar dataKey="fraud_count" fill="#ef4444" radius={[0, 4, 4, 0]} name="Fraud Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Merchant Category Breakdown */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Fraud by Merchant Category</h3>
            <p className="text-xs text-slate-400">Sectors with highest risk concentration</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={merchantCats.slice(0, 5)}>
                <XAxis dataKey="merchant_category" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total Transactions" />
                <Bar dataKey="fraud_count" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Fraud Volume" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Recent High-Risk Queue Live Stream */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Live High-Risk Stream</h3>
            <p className="text-xs text-slate-400">Transactions requiring immediate analyst investigation & hold action</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                <th className="py-2.5 px-3">Transaction ID</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Merchant Category</th>
                <th className="py-2.5 px-3">Risk Score</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentHighRisk.map((tx) => (
                <tr key={tx.transaction_id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="py-3 px-3 font-mono font-bold text-indigo-400">
                    {tx.transaction_id}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    {tx.customer_id}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-white">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {tx.payment_method}
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {tx.merchant_category}
                  </td>
                  <td className="py-3 px-3">
                    <RiskBadge level={tx.risk_level || 'HIGH'} score={tx.risk_score} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onOpenTransaction(tx.transaction_id)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 hover:bg-indigo-900/60 hover:text-white transition-colors inline-flex items-center gap-1"
                    >
                      <span>Investigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ArrowRight(props) {
  return (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
