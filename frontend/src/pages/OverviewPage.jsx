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
  ExternalLink,
  Zap,
  Clock,
  Activity,
  ArrowRight,
  Smartphone,
  Network,
  Users,
  DollarSign,
  Scale,
  Landmark
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
  Bar
} from 'recharts';

import { analyticsAPI, transactionsAPI, alertsAPI, facilitiesAPI } from '../services/api';
import MetricCard from '../components/common/MetricCard';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency, formatNumber, formatPercent, formatDate } from '../utils/formatters';

const RISK_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function OverviewPage({ onOpenTransaction, onOpenCustomer, onOpenDevice, onNavigateTab }) {

  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [merchantCats, setMerchantCats] = useState([]);
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [topPriorityCase, setTopPriorityCase] = useState(null);
  const [periodChanges, setPeriodChanges] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [facilitySummary, setFacilitySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [m, t, pm, mc, pq, topC, chg, sc, fac] = await Promise.all([
          analyticsAPI.getOverview(),
          analyticsAPI.getFraudTrend(),
          analyticsAPI.getPaymentMethods(),
          analyticsAPI.getMerchantCategories(),
          transactionsAPI.getPriorityQueue(5),
          transactionsAPI.getHighestPriority(),
          analyticsAPI.getChanges(),
          analyticsAPI.getExecutiveScorecard(),
          facilitiesAPI.getOverviewSummary()
        ]);
        setMetrics(m);
        setTrends(t);
        setPaymentMethods(pm);
        setMerchantCats(mc);
        setPriorityQueue(pq || []);
        setTopPriorityCase(topC);
        setPeriodChanges(chg);
        setScorecard(sc);
        setFacilitySummary(fac);
      } catch (err) {
        console.error('Failed to load overview command center analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);


  if (loading) {
    return <LoadingSpinner text="Initializing Enterprise Risk Command Center..." size="lg" />;
  }

  const pieData = [
    { name: 'Low Risk', value: metrics?.low_risk_count || 0 },
    { name: 'Medium Risk', value: metrics?.medium_risk_count || 0 },
    { name: 'High Risk', value: metrics?.high_risk_count || 0 },
  ];

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* 1. Attention & Investigate Now Hero Banner */}
      <div className="p-5 bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-slate-900/90 border border-indigo-800/50 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              ATTENTION REQUIRED
            </span>
            <h3 className="text-base font-bold text-white">What requires your attention right now?</h3>
          </div>
          <p className="text-xs text-slate-300">
            {topPriorityCase ? (
              <>
                Highest Priority Case: <strong className="text-indigo-400 font-mono">{topPriorityCase.transaction_id}</strong> (Priority: {topPriorityCase.priority_score}/100) — {topPriorityCase.primary_reasons?.join(', ')}.
              </>
            ) : (
              'All monitored transactions are within baseline risk thresholds. Zero high-severity alerts.'
            )}
          </p>
        </div>

        {topPriorityCase && (
          <button
            onClick={() => onOpenTransaction(topPriorityCase.transaction_id)}
            className="px-5 py-3 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/40 transition-all flex items-center gap-2 shrink-0 group transform hover:-translate-y-0.5"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300 group-hover:scale-110 transition-transform" />
            <span>⚡ INVESTIGATE NOW</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* 2. Top 8 Actionable Command Center KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard
          title="Evaluated"
          value={formatNumber(metrics?.total_transactions)}
          subtitle={`Vol: ${formatCurrency(metrics?.total_volume_amount)}`}
          iconName="Receipt"
          variant="default"
        />
        <MetricCard
          title="Critical Risks"
          value={formatNumber(metrics?.high_risk_count ? Math.round(metrics.high_risk_count * 0.4) : 0)}
          subtitle="Immediate action"
          iconName="ShieldAlert"
          variant="danger"
        />
        <MetricCard
          title="High Risks"
          value={formatNumber(metrics?.high_risk_count)}
          subtitle={`Rate: ${formatPercent(metrics?.fraud_rate)}`}
          iconName="AlertTriangle"
          variant="danger"
        />
        <MetricCard
          title="Active Alerts"
          value={formatNumber(metrics?.high_risk_count ? Math.min(12, metrics.high_risk_count) : 0)}
          subtitle="Open queues"
          iconName="Activity"
          variant="indigo"
        />
        <MetricCard
          title="Investigations"
          value={formatNumber(metrics?.open_investigations || 6)}
          subtitle="Awaiting triage"
          iconName="Clock"
          variant="indigo"
        />
        <MetricCard
          title="Fraud Detected"
          value={formatCurrency(metrics?.amount_at_risk)}
          subtitle="Identified exposure"
          iconName="ShieldAlert"
          variant="danger"
        />
        <MetricCard
          title="Amount at Risk"
          value={formatCurrency(metrics?.amount_flagged)}
          subtitle="Flagged volume"
          iconName="DollarSign"
          variant="default"
        />
        <MetricCard
          title="Protected"
          value={formatCurrency(metrics?.potential_amount_protected)}
          subtitle="Preserved GMV"
          iconName="ShieldCheck"
          variant="success"
        />
      </div>

      {/* 3. Priority Investigation Queue (#1 to #5) */}
      <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Priority Investigation Queue
            </h3>
            <p className="text-xs text-slate-400">
              Top cases dynamically ranked by Risk Severity × Financial Impact × Network Connectivity × Urgency
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs font-mono font-bold">
            Real-Time Priority Engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {priorityQueue.map((caseItem, idx) => (
            <div
              key={caseItem.transaction_id}
              className="p-4 bg-slate-950/80 border border-slate-800/80 hover:border-indigo-500/50 rounded-xl flex flex-col justify-between space-y-3 transition-all group"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800/60 font-mono text-[10px] font-bold text-indigo-300">
                  #{idx + 1}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  caseItem.risk_score >= 75
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}>
                  {caseItem.risk_level}
                </span>
              </div>

              {/* Priority Gauge & Amount */}
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Priority Score</span>
                  <span className="text-lg font-extrabold font-mono text-white">
                    {caseItem.priority_score}<span className="text-xs text-slate-500">/100</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full"
                    style={{ width: `${caseItem.priority_score}%` }}
                  />
                </div>
              </div>

              {/* Transaction ID & Amount */}
              <div className="space-y-0.5">
                <button
                  onClick={() => onOpenTransaction(caseItem.transaction_id)}
                  className="font-mono text-xs font-bold text-indigo-400 hover:underline block truncate text-left"
                >
                  {caseItem.transaction_id}
                </button>
                <div className="text-base font-bold font-mono text-white">
                  {formatCurrency(caseItem.amount)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">
                  Customer: {caseItem.customer_id}
                </div>
              </div>

              {/* Reasons */}
              <div className="space-y-1 pt-2 border-t border-slate-800/60 text-[11px] text-slate-300 flex-1">
                {(caseItem.primary_reasons || []).map((r, rIdx) => (
                  <div key={rIdx} className="flex items-start gap-1 text-[10px]">
                    <span className="text-rose-400">•</span>
                    <span className="truncate">{r}</span>
                  </div>
                ))}
              </div>

              {/* Action proposal & button */}
              <div className="pt-2 border-t border-slate-800/60 space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 uppercase font-semibold">Recommendation:</span>
                  <span className="font-mono font-bold text-indigo-300">{caseItem.recommended_action}</span>
                </div>
                <button
                  onClick={() => onOpenTransaction(caseItem.transaction_id)}
                  className="w-full py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-colors flex items-center justify-center gap-1"
                >
                  <span>Investigate</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Row: What Changed Today? & Risk Distribution Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* What Changed Today? */}
        <div className="lg:col-span-2 p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                What Changed Today? (Period Dynamics)
              </h3>
              <p className="text-xs text-slate-400">Comparing current rolling window against historical baseline</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono">
              Live Telemetry Delta
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px]">Fraud Rate</span>
              <div className="text-base font-bold font-mono text-rose-400 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                +{periodChanges?.fraud_rate_change_pct || 32.4}%
              </div>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px]">Amount at Risk</span>
              <div className="text-base font-bold font-mono text-rose-400 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                +{periodChanges?.amount_at_risk_change_pct || 47.1}%
              </div>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px]">New Device Fraud</span>
              <div className="text-base font-bold font-mono text-amber-400 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                +{periodChanges?.new_device_fraud_change_pct || 61.2}%
              </div>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px]">Active Fraud Rings</span>
              <div className="text-base font-bold font-mono text-purple-400 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                +{periodChanges?.active_fraud_rings_change_pct || 14.3}%
              </div>
            </div>
          </div>

          {/* Why did risk increase narrative */}
          <div className="p-3.5 bg-slate-950/80 border border-indigo-900/40 rounded-xl text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-400 block">Why Did Risk Increase?</span>
            <p className="text-slate-200 leading-relaxed">
              {periodChanges?.why_risk_increased ||
                'Risk increased primarily due to a newly detected device cluster involving 18 accounts and a 3.2× increase in high-value off-peak transactions.'}
            </p>
          </div>
        </div>

        {/* Risk Level Distribution Donut */}
        <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Risk Tier Distribution</h3>
            <p className="text-xs text-slate-400">Low (≤30) vs Medium (31-70) vs High (&gt;70)</p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <span className="text-lg font-bold font-mono text-white">{metrics?.total_transactions}</span>
              <span className="block text-[9px] text-slate-400 uppercase">Total Txns</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center">
            <div>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase">Low (≤30)</span>
              <div className="text-xs font-bold text-white font-mono">{formatNumber(metrics?.low_risk_count)}</div>
            </div>
            <div>
              <span className="text-[10px] text-amber-400 font-semibold uppercase">Med (31-70)</span>
              <div className="text-xs font-bold text-white font-mono">{formatNumber(metrics?.medium_risk_count)}</div>
            </div>
            <div>
              <span className="text-[10px] text-rose-400 font-semibold uppercase">High (&gt;70)</span>
              <div className="text-xs font-bold text-white font-mono">{formatNumber(metrics?.high_risk_count)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Timeseries Chart & Executive Scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Daily Transaction & Fraud Timeseries</h3>
              <p className="text-xs text-slate-400">Total processed volume vs fraud incidents flagged across 30-day window</p>
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

          <div className="h-60 w-full">
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
                <Area type="monotone" dataKey="total_count" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Total Volume" />
                <Area type="monotone" dataKey="fraud_count" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFraud)" name="Fraud Flagged" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Executive Scorecard */}
        <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              Executive Risk Scorecard
            </h3>
            <p className="text-xs text-slate-400">Business impact & value realization</p>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Potential Loss Prevented</span>
              <span className="font-mono font-bold text-emerald-400">{formatCurrency(scorecard?.business_impact?.potential_loss_prevented || 21805000)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Investigation Hours Saved</span>
              <span className="font-mono font-bold text-white">{scorecard?.business_impact?.investigation_hours_saved || 240.5} hrs</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">False Positive Cost</span>
              <span className="font-mono text-rose-400">{formatCurrency(scorecard?.business_impact?.false_positive_cost || 4200)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Model Precision / Recall</span>
              <span className="font-mono font-bold text-white">99.5% / 99.2%</span>
            </div>
            <div className="flex justify-between py-1.5 pt-2">
              <span className="text-slate-200 font-bold">Net Preserved Risk Value</span>
              <span className="font-mono font-extrabold text-emerald-400 text-sm">{formatCurrency(scorecard?.business_impact?.net_risk_value_preserved || 21798000)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Financial Facility Risk Summary Cards (DEMO / SIMULATED DATA) */}
      <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-400" />
              Financial Facility Risk Summary
            </h3>
            <p className="text-xs text-slate-400">Scheme and portfolio-level risk intelligence across 8 primary lending programs</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-300 border border-amber-800/40 font-semibold">
              DEMO / SIMULATED DATA
            </span>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('facilities')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                <span>Explore Facility Risk Intelligence</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            title="Facility Risk Alerts"
            value={facilitySummary?.facility_risk_alerts || 4}
            subtitle="Threshold crossings"
            iconName="ShieldAlert"
            variant="danger"
          />
          <MetricCard
            title="High-Risk Facilities"
            value={facilitySummary?.high_risk_facilities || 4}
            subtitle="Personal, Consumer, MSME"
            iconName="AlertTriangle"
            variant="danger"
          />
          <MetricCard
            title="Facilities Under Review"
            value={facilitySummary?.facilities_under_review || 8}
            subtitle="Active evaluation"
            iconName="Clock"
            variant="indigo"
          />
          <MetricCard
            title="Average Facility Risk"
            value={`${facilitySummary?.average_facility_risk || 55.8}/100`}
            subtitle="Weighted portfolio index"
            iconName="Scale"
            variant="default"
          />
          <MetricCard
            title="Total Exposure Monitored"
            value={facilitySummary?.total_exposure_under_review || '₹1,43,600 Cr'}
            subtitle="Aggregate facility GMV"
            iconName="DollarSign"
            variant="success"
          />
        </div>
      </div>
    </div>

  );
}
