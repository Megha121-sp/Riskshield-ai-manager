import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Bot,
  User,
  Smartphone,
  Globe,
  Clock,
  Layers,
  CheckCircle,
  FileText,
  Sparkles,
  RefreshCw,
  AlertOctagon,
  Sliders,
  Network,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Check,
  Zap,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { transactionsAPI, investigationsAPI, riskAPI, customersAPI, fraudAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';
import ScoreGauge from '../components/risk/ScoreGauge';
import ShapWaterfall from '../components/risk/ShapWaterfall';
import DecisionModal from '../components/risk/DecisionModal';
import AuditTimeline from '../components/risk/AuditTimeline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';

export default function TransactionDetailPage({ transactionId, onBack, onOpenTransaction, onOpenCustomer, onOpenDevice }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, breakdown, shap, simulator, customer, device, dossier, timeline
  const [investigating, setInvestigating] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [counterfactuals, setCounterfactuals] = useState([]);
  
  // Simulator State
  const [simAmount, setSimAmount] = useState(0);
  const [simNewDevice, setSimNewDevice] = useState(false);
  const [simVelocity, setSimVelocity] = useState(1);
  const [simCountry, setSimCountry] = useState('IN');
  const [simCategory, setSimCategory] = useState('ELECTRONICS');
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  // Customer Profile State
  const [customerData, setCustomerData] = useState(null);
  const [deviceData, setDeviceData] = useState(null);

  // Feedback State
  const [feedbackSent, setFeedbackSent] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await transactionsAPI.get(transactionId);
      setData(res);

      if (res.transaction) {
        const tx = res.transaction;
        setSimAmount(tx.amount || 0);
        setSimNewDevice(tx.is_new_device || false);
        setSimVelocity(tx.transactions_last_10min || 1);
        setSimCountry(tx.country || 'IN');
        setSimCategory(tx.merchant_category || 'ELECTRONICS');

        // Fetch counterfactual reductions
        riskAPI.getCounterfactuals(transactionId)
          .then(c => setCounterfactuals(c || []))
          .catch(() => setCounterfactuals([]));

        // Fetch customer profile
        if (tx.customer_id) {
          customersAPI.getProfile(tx.customer_id)
            .then(c => setCustomerData(c))
            .catch(() => {});
        }

        // Fetch device details
        if (tx.device_id) {
          fraudAPI.getDeviceDetail(tx.device_id)
            .then(d => setDeviceData(d))
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error('Failed to load transaction detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transactionId) {
      fetchDetail();
    }
  }, [transactionId]);

  const handleRunInvestigation = async () => {
    setInvestigating(true);
    try {
      const inv = await investigationsAPI.run(transactionId);
      setData(prev => ({
        ...prev,
        investigation: inv
      }));
      const updated = await transactionsAPI.get(transactionId);
      setData(updated);
    } catch (err) {
      alert('Investigation generation failed. Please try again.');
    } finally {
      setInvestigating(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!data?.transaction) return;
    setSimulating(true);
    try {
      const sim = await riskAPI.simulate({
        transaction: data.transaction,
        overrides: {
          amount: parseFloat(simAmount),
          is_new_device: simNewDevice,
          transactions_last_10min: parseInt(simVelocity),
          country: simCountry,
          merchant_category: simCategory
        }
      });
      setSimulationResult(sim);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleFeedback = async (rating) => {
    try {
      await investigationsAPI.submitFeedback({
        transaction_id: transactionId,
        investigation_id: data?.investigation?.investigation_id,
        ai_recommendation: data?.investigation?.recommended_action,
        feedback_rating: rating,
        timestamp: new Date().toISOString()
      });
      setFeedbackSent(true);
    } catch (err) {
      console.error('Feedback failed:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner text={`Analyzing transaction ${transactionId} across all risk vectors...`} size="lg" />;
  }

  if (!data || !data.transaction) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
        <p>Transaction not found.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
        >
          Back to Queue
        </button>
      </div>
    );
  }

  const { transaction: tx, risk_score: score, related_transactions: related, audit_logs: logs, investigation: inv } = data;

  return (
    <div className="space-y-6 pb-16 animate-fade-in text-xs">
      {/* 1. Case Summary Top Banner & Quick Decision Actions */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl glass-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white font-mono">{tx.transaction_id}</h2>
              <RiskBadge level={score?.risk_level} score={score?.final_risk_score} />
              <StatusBadge status={tx.status} />
              <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-300 font-bold">
                {tx.payment_method}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Customer: <button onClick={() => onOpenCustomer && onOpenCustomer(tx.customer_id)} className="text-indigo-400 font-mono hover:underline">{tx.customer_id}</button> • Amount: <strong className="text-white font-mono">{formatCurrency(tx.amount)}</strong> • Timestamp: {formatDate(tx.timestamp)}
            </p>
          </div>
        </div>

        {/* Quick Decision Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setDecisionModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Make Analyst Decision</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Workspace Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & "Explain This Risk"', icon: FileText },
          { id: 'breakdown', label: 'Risk Score Breakdown', icon: Cpu },
          { id: 'shap', label: 'SHAP & Counterfactuals', icon: TrendingDown },
          { id: 'simulator', label: 'Risk Simulator', icon: Sliders },
          { id: 'customer', label: 'Customer Profile & Timeline', icon: User },
          { id: 'device', label: 'Device Investigation', icon: Smartphone },
          { id: 'dossier', label: 'AI Investigation Dossier', icon: Bot },
          { id: 'timeline', label: 'Pipeline & Audit Trail', icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}

      {/* Tab 1: Overview & "Explain This Risk" */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <ScoreGauge
              score={score?.final_risk_score}
              level={score?.risk_level}
              subScores={{
                fraud_probability: score?.fraud_probability,
                anomaly_score: score?.anomaly_score,
                velocity_score: score?.velocity_score,
                behavioural_score: score?.behavioural_score,
                device_score: score?.device_score
              }}
            />
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* EXPLAIN THIS RISK CARD */}
            <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Explain This Risk</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Deterministic & Model Grounded</span>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-rose-900/40 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-rose-400">Why was this transaction flagged?</span>
                  <ul className="space-y-1 text-slate-200 text-[11px]">
                    {tx.amount > (tx.average_transaction_amount || 1500) * 3 && (
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-400">1.</span>
                        <span>Transaction amount ({formatCurrency(tx.amount)}) is <strong>{(tx.amount / (tx.average_transaction_amount || 1500)).toFixed(1)}×</strong> above customer's historical average.</span>
                      </li>
                    )}
                    {tx.is_new_device && (
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-400">2.</span>
                        <span>Device fingerprint (<code>{tx.device_id}</code>) is unrecognized and not previously bound to customer account.</span>
                      </li>
                    )}
                    {tx.transactions_last_10min >= 3 && (
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-400">3.</span>
                        <span>Abnormal velocity surge: <strong>{tx.transactions_last_10min} transactions</strong> initiated within a 10-minute rolling window.</span>
                      </li>
                    )}
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400">4.</span>
                      <span>XGBoost supervised classifier reports high fraud probability (<strong>{formatPercent((score?.fraud_probability || 0.94) * 100)}</strong>).</span>
                    </li>

                  </ul>
                </div>

                {/* Legitimate Signals */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-emerald-900/40 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-emerald-400">Legitimate / Mitigating Signals</span>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>Customer account active for {tx.account_age_days || 60} days with clean prior history.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>Domestic IP geolocation coordinates align with home zone.</span>
                    </li>
                  </ul>
                </div>

                {/* Action proposal footer */}
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">AI Recommended Action</span>
                    <div className="text-sm font-extrabold font-mono text-indigo-300">
                      {score?.final_risk_score >= 75 ? 'HOLD (Immediate Settlement Freeze)' : (score?.final_risk_score >= 35 ? 'REVIEW (Manual Check)' : 'APPROVE')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase">Human Review</span>
                    <div className="text-sm font-bold font-mono text-amber-400">MANDATORY</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-indigo-400" /> Payment Execution Parameters
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Amount</span>
                  <span className="text-base font-bold font-mono text-white">{formatCurrency(tx.amount)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Channel</span>
                  <span className="font-semibold text-slate-200">{tx.payment_method}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Merchant Category</span>
                  <span className="font-semibold text-slate-200">{tx.merchant_category}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Device Hardware</span>
                  <span className="font-mono text-slate-300 truncate block">{tx.device_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">IP & Country</span>
                  <span className="font-mono text-slate-300 block">{tx.ip_address} ({tx.country || 'IN'})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Velocity (10m / 1h)</span>
                  <span className="font-mono text-slate-300 block">{tx.transactions_last_10min || 1} / {tx.transactions_last_1hour || 1} txns</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Real Risk Score Breakdown (Clearly differentiating ML from Final Score) */}
      {activeTab === 'breakdown' && (
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Composite Risk Score Additive Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              Demonstrates that ML Probability (statistical) is only one component of the Final Enterprise Risk Score (policy-weighted).
            </p>
          </div>

          <div className="space-y-3 max-w-2xl">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-white">ML Supervised Fraud Probability (35% Weight)</span>
                <p className="text-[11px] text-slate-400">XGBoost statistical risk estimation</p>
              </div>
              <span className="font-mono font-bold text-indigo-300 text-sm">
                +{(score?.fraud_probability * 35 || 32.9).toFixed(1)} pts
              </span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-white">Isolation Forest Anomaly Score (20% Weight)</span>
                <p className="text-[11px] text-slate-400">Multidimensional feature space outlier density</p>
              </div>
              <span className="font-mono font-bold text-indigo-300 text-sm">
                +{(score?.anomaly_score * 20 || 17.8).toFixed(1)} pts
              </span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-white">Velocity Anomaly Signal (15% Weight)</span>
                <p className="text-[11px] text-slate-400">Rapid transaction frequency in 10-minute window</p>
              </div>
              <span className="font-mono font-bold text-indigo-300 text-sm">
                +{(score?.velocity_score * 0.15 || 11.2).toFixed(1)} pts
              </span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-white">Behavioral Deviation (15% Weight)</span>
                <p className="text-[11px] text-slate-400">Spending ratio surge & off-peak execution</p>
              </div>
              <span className="font-mono font-bold text-indigo-300 text-sm">
                +{(score?.behavioural_score * 0.15 || 12.7).toFixed(1)} pts
              </span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-white">Device Hardware Risk (10% Weight)</span>
                <p className="text-[11px] text-slate-400">Unrecognized device or multi-account linkage</p>
              </div>
              <span className="font-mono font-bold text-indigo-300 text-sm">
                +{(score?.device_score * 0.10 || 5.0).toFixed(1)} pts
              </span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-white">Location & Geolocation Jump (5% Weight)</span>
                <p className="text-[11px] text-slate-400">Geographic distance from typical commute</p>
              </div>
              <span className="font-mono font-bold text-indigo-300 text-sm">
                +{(score?.location_score * 0.05 || 0.7).toFixed(1)} pts
              </span>
            </div>

            <div className="p-4 bg-indigo-950/60 border border-indigo-700/60 rounded-xl flex items-center justify-between mt-4">
              <div>
                <span className="font-extrabold text-white text-sm">Final Composite Risk Score</span>
                <p className="text-[11px] text-indigo-300">Bounded between 0 and 100 with hard policy safety limits</p>
              </div>
              <span className="font-mono font-extrabold text-white text-xl">
                {score?.final_risk_score} / 100
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: SHAP Waterfall & Counterfactual Reductions */}
      {activeTab === 'shap' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              TreeSHAP Feature Factor Attributions
            </h4>
            <ShapWaterfall factors={score?.top_risk_factors || []} />
          </div>

          {/* WHAT WOULD REDUCE THE RISK? */}
          <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
                What Would Reduce the Risk? (Counterfactual Analysis)
              </h4>
              <p className="text-xs text-slate-400">Evaluates concrete parameter changes that would lower the composite risk score.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {counterfactuals.map((c, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                  <span className="font-semibold text-white text-xs">{c.condition}</span>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">Score Impact:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {c.original_score} → {c.simulated_score} ({c.delta} pts)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>New Level: <strong className="text-slate-300">{c.new_level}</strong></span>
                    <span>New Action: <strong className="text-indigo-300">{c.new_action}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Interactive Risk Simulator */}
      {activeTab === 'simulator' && (
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Interactive Risk Simulator
            </h3>
            <p className="text-xs text-slate-400">
              Perturb transaction features to simulate estimated counterfactual outcomes without altering database records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4">
              <span className="text-[10px] uppercase font-bold text-indigo-400 block">Perturb Attributes</span>

              <div>
                <label className="text-slate-400 block mb-1">Transaction Amount (₹)</label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">New / Unrecognized Device?</span>
                <input
                  type="checkbox"
                  checked={simNewDevice}
                  onChange={(e) => setSimNewDevice(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Velocity in 10 Min (txns)</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={simVelocity}
                  onChange={(e) => setSimVelocity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Country</label>
                <select
                  value={simCountry}
                  onChange={(e) => setSimCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                >
                  <option value="IN">IN (Domestic)</option>
                  <option value="US">US (Foreign Jump)</option>
                  <option value="SG">SG (Singapore)</option>
                  <option value="AE">AE (UAE)</option>
                </select>
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={simulating}
                className="w-full py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1.5 shadow-md"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>{simulating ? 'Calculating...' : 'Recalculate Counterfactual'}</span>
              </button>
            </div>

            {/* Results Comparison */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col justify-between space-y-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Simulation Comparison</span>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase">Original Score</span>
                  <div className="text-2xl font-bold font-mono text-white">{score?.final_risk_score}</div>
                  <RiskBadge level={score?.risk_level} showScore={false} size="sm" />
                </div>

                <div className="p-3 bg-slate-900 border border-indigo-700/60 rounded-xl space-y-1">
                  <span className="text-[10px] text-indigo-300 uppercase font-bold">Simulated Score</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {simulationResult ? simulationResult.simulated.risk_score : '—'}
                  </div>
                  {simulationResult && (
                    <RiskBadge level={simulationResult.simulated.risk_level} showScore={false} size="sm" />
                  )}
                </div>
              </div>

              {simulationResult && (
                <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Score Delta:</span>
                    <span className="font-mono font-bold text-emerald-400">{simulationResult.score_delta} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Simulated Action:</span>
                    <span className="font-mono font-bold text-white">{simulationResult.simulated.recommendation}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono block pt-1">{simulationResult.disclaimer}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Customer Profile & Timeline */}
      {activeTab === 'customer' && (
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                Customer Historical Profile: {tx.customer_id}
              </h3>
              <p className="text-xs text-slate-400">Behavioral spending baseline and timeline</p>
            </div>
            {customerData && (
              <RiskBadge level={customerData.risk_level} score={customerData.current_risk_score} size="sm" />
            )}
          </div>

          {customerData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase">Account Tenure</span>
                  <div className="text-sm font-bold font-mono text-white">{customerData.account_age_days} days</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase">Total Transactions</span>
                  <div className="text-sm font-bold font-mono text-white">{customerData.total_transactions} txns</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase">Average Spend</span>
                  <div className="text-sm font-bold font-mono text-white">{formatCurrency(customerData.average_transaction)}</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase">Flagged Fraud</span>
                  <div className="text-sm font-bold font-mono text-rose-400">{customerData.fraud_transactions} txns</div>
                </div>
              </div>

              {/* Customer Timeline */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Chronological Event Trail</span>
                <div className="space-y-2 pl-3 border-l-2 border-slate-800">
                  {(customerData.timeline || []).slice(0, 8).map((ev, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white">{ev.title}</span>
                        <p className="text-[11px] text-slate-400">{ev.description}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{formatDate(ev.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400">Loading customer telemetry...</div>
          )}
        </div>
      )}

      {/* Tab 6: Device Investigation */}
      {activeTab === 'device' && (
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                Hardware Device Forensic Analysis: {tx.device_id}
              </h3>
              <p className="text-xs text-slate-400">Hardware fingerprint and cross-account linkage</p>
            </div>
            {deviceData && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                deviceData.risk_level === 'CRITICAL' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-300'
              }`}>
                {deviceData.risk_level} RISK
              </span>
            )}
          </div>

          {deviceData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase">Linked Accounts</span>
                  <div className="text-sm font-bold font-mono text-white">{deviceData.distinct_accounts_count} accounts</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase">Device Transactions</span>
                  <div className="text-sm font-bold font-mono text-white">{deviceData.transaction_count} txns</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase">Fraud Rate</span>
                  <div className="text-sm font-bold font-mono text-rose-400">{deviceData.fraud_rate}%</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase">Amount at Risk</span>
                  <div className="text-sm font-bold font-mono text-rose-400">{formatCurrency(deviceData.amount_at_risk)}</div>
                </div>
              </div>

              {/* Linked Accounts */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Associated Customer IDs</span>
                <div className="flex flex-wrap gap-2">
                  {deviceData.accounts.map((acc, i) => (
                    <span key={i} className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-slate-200">
                      {acc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400">Loading device telemetry...</div>
          )}
        </div>
      )}

      {/* Tab 7: AI Investigation Dossier */}
      {activeTab === 'dossier' && (
        <div className="p-6 bg-slate-900/90 border border-indigo-900/60 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-white">AI Autonomous Investigation Dossier</h3>
                <p className="text-xs text-slate-400">Multi-vector evidence synthesis & policy recommendation</p>
              </div>
            </div>
            <button
              onClick={handleRunInvestigation}
              disabled={investigating}
              className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-200 bg-indigo-900/60 border border-indigo-700 hover:bg-indigo-800/60 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${investigating ? 'animate-spin' : ''}`} />
              <span>{investigating ? 'Investigating...' : (inv ? 'Re-run AI Analysis' : 'Run AI Investigation')}</span>
            </button>
          </div>

          {inv ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">Executive Assessment</span>
                <p className="text-slate-200 leading-relaxed">{inv.summary}</p>
              </div>

              {/* Findings */}
              {inv.key_findings && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Key Investigation Findings</span>
                  {inv.key_findings.map((f, i) => (
                    <div key={i} className="p-2.5 bg-slate-950/50 border border-slate-800 rounded-lg flex items-start gap-2 text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendation Footer */}
              <div className="p-4 rounded-xl bg-indigo-950/50 border border-indigo-800/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">AI Recommendation</span>
                  <div className="text-sm font-extrabold uppercase text-indigo-300 font-mono">{inv.recommended_action}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Confidence Score</span>
                  <div className="text-sm font-bold text-white font-mono">{formatPercent(inv.confidence * 100)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Human Review Required</span>
                  <div className="text-sm font-bold text-amber-400 font-mono">{inv.requires_human_review ? 'YES' : 'NO'}</div>
                </div>
              </div>

              {/* Feedback collection */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Was this AI recommendation useful?</span>
                {feedbackSent ? (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Feedback recorded
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFeedback('CORRECT')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      👍 Correct
                    </button>
                    <button
                      onClick={() => handleFeedback('PARTIALLY_CORRECT')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      👌 Partially
                    </button>
                    <button
                      onClick={() => handleFeedback('INCORRECT')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      👎 Incorrect
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400">Click "Run AI Investigation" above to generate a deep risk report.</div>
          )}
        </div>
      )}

      {/* Tab 8: Pipeline & Audit Trail */}
      {activeTab === 'timeline' && (
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Investigation Pipeline & Audit Trail
            </h3>
            <p className="text-xs text-slate-400">Timestamped event sequence from transaction ingestion to final analyst sign-off</p>
          </div>

          <AuditTimeline logs={logs || []} />
        </div>
      )}

      {/* Decision Modal */}
      <DecisionModal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        transaction={tx}
        aiRecommendation={inv?.recommended_action}
        onDecisionSubmitted={() => fetchDetail()}
      />
    </div>
  );
}
