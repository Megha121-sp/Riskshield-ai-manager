import React, { useState, useEffect } from 'react';
import {
  Landmark,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Sliders,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  Layers,
  Sparkles,
  RefreshCw,
  Scale,
  Settings,
  X,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  Bot,
  UserCheck,
  Send,
  Zap,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

import { facilitiesAPI } from '../services/api';
import MetricCard from '../components/common/MetricCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

const FACILITY_OPTIONS = [
  'Education Loan',
  'Health / Medical Loan',
  'Home Loan',
  'Personal Loan',
  'MSME Loan',
  'Vehicle Loan',
  'Agriculture Loan',
  'Consumer Loan',
  'Other Financial Schemes'
];

export default function FacilityRiskPage({ currentUser, onOpenAlerts, onOpenAudit }) {
  const [selectedFacility, setSelectedFacility] = useState('Education Loan');
  const [assessment, setAssessment] = useState(null);
  const [allFacilities, setAllFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [investigateModalOpen, setInvestigateModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Scenario Simulator State
  const [simDefaultRate, setSimDefaultRate] = useState('MEDIUM');
  const [simIncomeStability, setSimIncomeStability] = useState('MEDIUM');
  const [simLoanTenure, setSimLoanTenure] = useState('MEDIUM');
  const [simCollateral, setSimCollateral] = useState('MEDIUM');
  const [simConcentration, setSimConcentration] = useState('MEDIUM');
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  // Analyst Assessment State
  const [analystDecision, setAnalystDecision] = useState('REVIEW');
  const [analystNotes, setAnalystNotes] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionSuccess, setDecisionSuccess] = useState(null);

  // Admin Config State
  const [adminConfig, setAdminConfig] = useState({
    low_threshold: 30,
    moderate_threshold: 60,
    high_threshold: 80,
    confidence_threshold: 70,
    alert_threshold: 65,
    alerts_enabled: true
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Load facility data
  const loadFacilityData = async (facilityType, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [facData, allData] = await Promise.all([
        facilitiesAPI.get(facilityType),
        facilitiesAPI.list()
      ]);
      setAssessment(facData);
      setAllFacilities(allData || []);

      // Reset scenario inputs
      setSimDefaultRate('MEDIUM');
      setSimIncomeStability('MEDIUM');
      setSimLoanTenure('MEDIUM');
      setSimCollateral('MEDIUM');
      setSimConcentration('MEDIUM');
      setSimResult(null);
      setDecisionSuccess(null);
    } catch (err) {
      console.error('Failed to load facility data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFacilityData(selectedFacility);
  }, [selectedFacility]);

  // Load admin config on mount
  useEffect(() => {
    facilitiesAPI.getConfig()
      .then(cfg => setAdminConfig(cfg))
      .catch(() => {});
  }, []);

  // Run scenario simulation
  const handleRunSimulation = async () => {
    if (!assessment) return;
    setSimulating(true);
    try {
      const res = await facilitiesAPI.simulate({
        facility_type: selectedFacility,
        default_rate: simDefaultRate,
        income_stability: simIncomeStability,
        loan_tenure: simLoanTenure,
        collateral_coverage: simCollateral,
        portfolio_concentration: simConcentration
      });
      setSimResult(res);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setSimulating(false);
    }
  };

  // Submit Analyst Decision
  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    if (!analystNotes.trim()) {
      alert('Analyst justification notes are required for compliance auditability.');
      return;
    }
    setSubmittingDecision(true);
    try {
      const res = await facilitiesAPI.submitDecision({
        facility_id: assessment.facility_id,
        facility_type: assessment.facility_type || selectedFacility,
        risk_score: assessment.risk_score,
        decision: analystDecision,
        notes: analystNotes,
        analyst_id: currentUser?.username || 'analyst@riskshield.ai'
      });
      setDecisionSuccess(res);
      setAnalystNotes('');
    } catch (err) {
      alert('Failed to record analyst decision.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Save Admin Config
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await facilitiesAPI.updateConfig(adminConfig);
      setConfigSuccess(true);
      setTimeout(() => {
        setConfigSuccess(false);
        setConfigModalOpen(false);
      }, 1200);
    } catch (err) {
      alert('Failed to update facility thresholds.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Color helpers
  const getRiskScoreColor = (score, level) => {
    if (level === 'INSUFFICIENT_DATA') return 'text-slate-400 border-slate-700 bg-slate-900';
    if (score <= 30) return 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40';
    if (score <= 60) return 'text-amber-400 border-amber-800/80 bg-amber-950/40';
    if (score <= 80) return 'text-rose-400 border-rose-800/80 bg-rose-950/40';
    return 'text-red-400 border-red-800/80 bg-red-950/40';
  };

  const getSuitabilityBadge = (signal) => {
    switch (signal) {
      case 'LOWER RISK':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'MODERATE RISK':
        return 'bg-amber-950 text-amber-400 border-amber-800';
      case 'HIGHER RISK':
        return 'bg-rose-950 text-rose-400 border-rose-800';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  // Breakdown chart data
  const dimensionalChartData = assessment ? [
    { name: 'Default', score: assessment.default_risk, fill: '#f59e0b' },
    { name: 'Loss Severity', score: assessment.loss_severity, fill: '#ef4444' },
    { name: 'Liquidity', score: assessment.liquidity_risk, fill: '#6366f1' },
    { name: 'Concentration', score: assessment.concentration_risk, fill: '#ec4899' },
    { name: 'Operational', score: assessment.operational_risk, fill: '#8b5cf6' }
  ] : [];

  if (loading) {
    return <LoadingSpinner text="Evaluating financial facility risk models & indicators..." size="lg" />;
  }

  const isInsufficient = assessment?.risk_level === 'INSUFFICIENT_DATA';

  return (
    <div className="space-y-6 pb-16 animate-fade-in text-xs">
      {/* 1. Header & Regulatory Disclaimer Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-900/95 to-indigo-950/40 border border-slate-800 rounded-2xl glass-card space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                  Financial Facility Risk Intelligence
                  <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800/80 text-[10px] font-mono text-indigo-300 font-bold">
                    FACILITY MODULE
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Assess credit, portfolio and scheme-level risk before allocation or investment decisions.
                </p>
              </div>
            </div>
          </div>

          {/* Top Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Facility Selector */}
            <div className="relative">
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 font-mono shadow-sm cursor-pointer pr-8"
              >
                {FACILITY_OPTIONS.map((fac) => (
                  <option key={fac} value={fac}>{fac}</option>
                ))}
              </select>
            </div>

            {/* Compare Facilities Button */}
            <button
              onClick={() => setCompareModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Compare Facilities</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => loadFacilityData(selectedFacility, true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh Risk Assessment"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Admin Config Button */}
            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={() => setConfigModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-purple-950/60 border border-purple-800/80 text-purple-300 hover:text-white font-semibold transition-colors flex items-center gap-1.5"
                title="Facility Risk Configuration (Admin)"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}

            {/* Investigate Risk Primary CTA */}
            <button
              onClick={() => setInvestigateModalOpen(true)}
              className="px-4 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Investigate Risk</span>
            </button>
          </div>
        </div>

        {/* Regulatory Disclaimer Notice */}
        <div className="p-3 bg-slate-950/80 border border-amber-900/40 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-300 leading-relaxed">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300">Analytical Decision-Support Notice: </span>
            {assessment?.disclaimer || "RiskShield provides analytical risk signals for decision support and does not constitute financial or investment advice. Actual risk depends on borrower quality, portfolio composition, market conditions, institution policies, and other factors."}
          </div>
        </div>
      </div>

      {/* 2. Facility Hero Score & Suitability Signal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Risk Score Card */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Facility Risk Score</span>
              <h2 className="text-base font-bold text-white font-mono mt-0.5">{assessment?.facility_name}</h2>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-300 border border-amber-800/40 font-semibold">
              DEMO / SIMULATED DATA
            </span>
          </div>

          {/* Large Score Indicator */}
          <div className="flex items-baseline gap-3 my-2">
            <div className="text-5xl font-extrabold font-mono tracking-tight text-white">
              {isInsufficient ? '—' : assessment?.risk_score}
            </div>
            <div className="space-y-1">
              <span className="text-sm font-mono text-slate-500 font-bold">/ 100</span>
              <div className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider ${getRiskScoreColor(assessment?.risk_score, assessment?.risk_level)}`}>
                {assessment?.risk_level} RISK
              </div>
            </div>
          </div>

          {/* Score Range Scale */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: '30%' }} title="Low (0-30)" />
              <div className="h-full bg-amber-500" style={{ width: '30%' }} title="Moderate (31-60)" />
              <div className="h-full bg-rose-500" style={{ width: '20%' }} title="High (61-80)" />
              <div className="h-full bg-red-600" style={{ width: '20%' }} title="Critical (81-100)" />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500 pt-0.5">
              <span>0 (Low)</span>
              <span>30 (Mod)</span>
              <span>60 (High)</span>
              <span>80 (Crit)</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Risk Suitability Signal Card */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Allocation Suitability</span>
            <span className="text-[10px] text-slate-500 font-mono">Engine v1.0</span>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] text-slate-400 font-medium">Risk Suitability Signal:</span>
            <div className={`px-3 py-1.5 rounded-xl border text-sm font-bold uppercase font-mono tracking-wider w-fit ${getSuitabilityBadge(assessment?.suitability_signal)}`}>
              {assessment?.suitability_signal}
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium pt-1">
              "{assessment?.suitability_recommendation}"
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 italic">
            * This is an analytical risk signal, not financial advice.
          </div>
        </div>

        {/* AI Facility Assessment Card */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1.5 tracking-wider">
              <Bot className="w-3.5 h-3.5" /> AI Risk Assessment
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800/60 text-[10px] font-mono text-indigo-300 font-semibold">
              Confidence: {assessment?.data_confidence}%
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
            {assessment?.executive_assessment}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Primary Concern</span>
              <span className="font-semibold text-slate-200 truncate block">{assessment?.primary_concern}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Risk Trend</span>
              <span className={`font-mono font-bold ${
                assessment?.risk_trend === 'IMPROVING' ? 'text-emerald-400' :
                assessment?.risk_trend === 'DETERIORATING' ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {assessment?.risk_trend}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Six Risk Summary Cards (Demo Labeled) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Portfolio Risk Dimensions (DEMO / SIMULATED DATA)
          </h3>
          <span className="text-[10px] font-mono text-slate-500">
            Assessed: {assessment?.profile?.assessment_date}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            title="Default Risk"
            value={isInsufficient ? '—' : `${assessment?.default_risk}/100`}
            subtitle={`Level: ${assessment?.default_risk_level}`}
            iconName="AlertTriangle"
            variant={assessment?.default_risk > 60 ? 'danger' : 'default'}
          />
          <MetricCard
            title="Portfolio Risk"
            value={isInsufficient ? '—' : `${assessment?.portfolio_risk}/100`}
            subtitle={`Level: ${assessment?.portfolio_risk_level}`}
            iconName="Layers"
            variant="default"
          />
          <MetricCard
            title="Loss Severity"
            value={isInsufficient ? '—' : `${assessment?.loss_severity}/100`}
            subtitle={`Level: ${assessment?.loss_severity_level}`}
            iconName="ShieldAlert"
            variant={assessment?.loss_severity > 60 ? 'danger' : 'default'}
          />
          <MetricCard
            title="Liquidity Risk"
            value={isInsufficient ? '—' : `${assessment?.liquidity_risk}/100`}
            subtitle={`Level: ${assessment?.liquidity_risk_level}`}
            iconName="TrendingDown"
            variant="indigo"
          />
          <MetricCard
            title="Concentration Risk"
            value={isInsufficient ? '—' : `${assessment?.concentration_risk}/100`}
            subtitle={`Level: ${assessment?.concentration_risk_level}`}
            iconName="Scale"
            variant="default"
          />
          <MetricCard
            title="Data Confidence"
            value={`${assessment?.data_confidence}%`}
            subtitle={`Reliability: ${assessment?.confidence_level}`}
            iconName="CheckCircle"
            variant={assessment?.data_confidence < 70 ? 'danger' : 'success'}
          />
        </div>
      </div>

      {/* 4. Explainability ("Why is this facility risky?") & Dimensional Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Factor Explainability Section */}
        <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Why is this facility risky? (Factor Explainability)
              </h3>
              <p className="text-xs text-slate-400">
                Factor contributions modeled in SHAP style distinguishing risk drivers from mitigating offsets.
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Relative Weight</span>
          </div>

          <div className="space-y-3">
            {/* Risk-Increasing Factors */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> RISK-INCREASING FACTORS
              </span>
              <div className="space-y-2">
                {(assessment?.risk_factors || [])
                  .filter(f => f.factor_type === 'RISK_INCREASING')
                  .map((factor, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/80 border border-rose-950/60 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{factor.name}</span>
                        <span className="font-mono font-bold text-rose-400 text-xs">
                          +{factor.impact.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {factor.explanation}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Risk-Reducing Mitigating Factors */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> RISK-REDUCING / MITIGATING FACTORS
              </span>
              <div className="space-y-2">
                {(assessment?.risk_factors || [])
                  .filter(f => f.factor_type === 'RISK_REDUCING')
                  .map((factor, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/80 border border-emerald-950/60 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{factor.name}</span>
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          {factor.impact.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {factor.explanation}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Risk Breakdown Chart & Profile */}
        <div className="space-y-6">
          {/* Dimensional Bar Chart */}
          <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Risk Dimension Scores</h3>
                <p className="text-xs text-slate-400">Comparison across primary underwriting and portfolio risk pillars</p>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Scale: 0-100</span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dimensionalChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} width={85} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                    formatter={(val) => [`${val}/100`, 'Risk Index']}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {dimensionalChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Facility Profile Details */}
          <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> Facility Profile & Structure
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase">Typical Tenure</span>
                <div className="font-semibold text-white font-mono">{assessment?.profile?.typical_tenure}</div>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase">Risk Category</span>
                <div className="font-semibold text-white">{assessment?.profile?.risk_category}</div>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase">Collateral Requirement</span>
                <div className="font-semibold text-slate-300 text-[11px] truncate">{assessment?.profile?.collateral_requirement}</div>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase">Portfolio Exposure</span>
                <div className="font-bold text-indigo-300 font-mono">{assessment?.profile?.portfolio_exposure}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Risk Scenario Simulator & 6-Month Historical Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Scenario Simulator */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Risk Scenario Simulator
              </h3>
              <p className="text-xs text-slate-400">Perturb macro and portfolio parameters to evaluate projected facility risk impact.</p>
            </div>
            <span className="text-[10px] font-mono text-amber-400/90 font-semibold">
              Illustrative scenario — not a forecast.
            </span>
          </div>

          {/* Simulator Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Borrower Default Rate</label>
              <select
                value={simDefaultRate}
                onChange={(e) => setSimDefaultRate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
              >
                <option value="LOW">Low Default Frequency</option>
                <option value="MEDIUM">Medium / Baseline</option>
                <option value="HIGH">High Default Stress (+14 pts)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Borrower Income Stability</label>
              <select
                value={simIncomeStability}
                onChange={(e) => setSimIncomeStability(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
              >
                <option value="HIGH">High Income Stability (-6 pts)</option>
                <option value="MEDIUM">Medium / Baseline</option>
                <option value="LOW">Low Income Stability (+9 pts)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Loan Tenure Horizon</label>
              <select
                value={simLoanTenure}
                onChange={(e) => setSimLoanTenure(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
              >
                <option value="SHORT">Short Tenure (-5 pts)</option>
                <option value="MEDIUM">Medium / Baseline</option>
                <option value="LONG">Long Tenure Duration (+7 pts)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Collateral Coverage</label>
              <select
                value={simCollateral}
                onChange={(e) => setSimCollateral(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
              >
                <option value="HIGH">High Security Haircut (-9 pts)</option>
                <option value="MEDIUM">Medium / Baseline</option>
                <option value="LOW">Low / Unsecured (+11 pts)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-400 block mb-1 font-semibold">Portfolio Concentration</label>
              <select
                value={simConcentration}
                onChange={(e) => setSimConcentration(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
              >
                <option value="LOW">Well Diversified Across Regions (-4 pts)</option>
                <option value="MEDIUM">Medium Portfolio Dispersion</option>
                <option value="HIGH">High Regional / Sector Concentration (+8 pts)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleRunSimulation}
            disabled={simulating || isInsufficient}
            className="w-full py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>{simulating ? 'Calculating Projection...' : 'Recalculate Illustrative Risk Score'}</span>
          </button>

          {/* Simulation Output */}
          {simResult && (
            <div className="p-4 bg-slate-950/90 border border-indigo-800/60 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Current Baseline</span>
                  <div className="text-xl font-bold font-mono text-white">{simResult.original_score}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="text-[10px] text-indigo-400 uppercase font-bold">Projected Score</span>
                  <div className="text-xl font-extrabold font-mono text-amber-400">{simResult.projected_score}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Points Delta</span>
                  <div className={`text-base font-bold font-mono ${simResult.score_delta > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {simResult.score_delta > 0 ? `+${simResult.score_delta}` : simResult.score_delta} pts
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400 font-semibold">Simulated Drivers:</span>
                <ul className="space-y-0.5 text-slate-300">
                  {simResult.key_drivers.map((kd, kIdx) => (
                    <li key={kIdx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span>{kd}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 6-Month Historical Risk Trend */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl glass-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Facility Risk Trend
              </h3>
              <p className="text-xs text-slate-400">Risk score progression over the last 6 assessment windows</p>
            </div>
            <span className="text-[10px] font-mono text-amber-300/80 font-semibold">
              Demo historical trend
            </span>
          </div>

          <div className="h-52 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={assessment?.historical_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="period" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                  formatter={(val, name) => [name === 'risk_score' ? `${val}/100` : `${val}%`, name === 'risk_score' ? 'Risk Score' : 'Default Rate']}
                />
                <Line type="monotone" dataKey="risk_score" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} name="Risk Score" />
                <Line type="monotone" dataKey="default_rate" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Default %" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-800">
            <span>Historical Model: Rule-based / Illustrative Facility Risk Engine v1.0</span>
            <span className="font-mono text-emerald-400 font-semibold">Audit Trail Available</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Compare Facilities Modal */}
      {/* ========================================================================= */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Illustrative Risk Comparison</h3>
                  <p className="text-xs text-slate-400">Cross-facility risk metrics generated from demo/simulated data</p>
                </div>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                    <th className="py-2.5 px-3">Facility</th>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Default Risk</th>
                    <th className="py-2.5 px-3">Loss Severity</th>
                    <th className="py-2.5 px-3">Liquidity Risk</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3">Overall Level</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {allFacilities.map((fac) => {
                    const isSelected = fac.facility_name === selectedFacility;
                    return (
                      <tr
                        key={fac.facility_id}
                        className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-indigo-950/30' : ''}`}
                      >
                        <td className="py-3 px-3 font-sans font-bold text-white">
                          {fac.facility_name}
                          {isSelected && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-indigo-900 text-indigo-300 font-mono">CURRENT</span>}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">{fac.risk_score}</td>
                        <td className="py-3 px-3 text-slate-300">{fac.default_risk}</td>
                        <td className="py-3 px-3 text-slate-300">{fac.loss_severity}</td>
                        <td className="py-3 px-3 text-slate-300">{fac.liquidity_risk}</td>
                        <td className="py-3 px-3 text-emerald-400 font-bold">{fac.data_confidence}%</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            fac.risk_level === 'LOW' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            fac.risk_level === 'MODERATE' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            fac.risk_level === 'HIGH' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {fac.risk_level}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedFacility(fac.facility_name);
                              setCompareModalOpen(false);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-white font-sans text-[11px] font-semibold transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Facility Investigation & Analyst Decision Modal */}
      {/* ========================================================================= */}
      {investigateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Facility Risk Investigation & Sign-Off</h3>
                  <p className="text-xs text-slate-400">Formal human-in-the-loop analyst assessment recorded in immutable audit trail</p>
                </div>
              </div>
              <button
                onClick={() => setInvestigateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* Summary Bar */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Target Facility</span>
                  <div className="text-sm font-bold text-white font-mono">{assessment?.facility_name}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Risk Score</span>
                  <div className="text-sm font-bold font-mono text-amber-400">{assessment?.risk_score} / 100</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Suitability Signal</span>
                  <div className="text-xs font-bold font-mono text-indigo-300">{assessment?.suitability_signal}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Analyst</span>
                  <div className="text-xs font-mono text-slate-300">{currentUser?.username || 'analyst'}</div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-400 block">AI Synthesis Dossier</span>
                <p className="text-slate-300 leading-relaxed">{assessment?.executive_assessment}</p>
              </div>

              {/* Analyst Decision Form */}
              <form onSubmit={handleSubmitDecision} className="space-y-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">
                    Analyst Assessment Action:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'REVIEW', label: 'Review Required' },
                      { id: 'APPROVE_FOR_CONSIDERATION', label: 'Approve Consideration' },
                      { id: 'REQUEST_MORE_DATA', label: 'Request More Data' },
                      { id: 'ESCALATE', label: 'Escalate to Committee' }
                    ].map((act) => (
                      <button
                        type="button"
                        key={act.id}
                        onClick={() => setAnalystDecision(act.id)}
                        className={`p-2 rounded-xl text-xs font-semibold text-center border transition-all ${
                          analystDecision === act.id
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">
                    Compliance Justification / Analyst Notes (Required for Audit Trail):
                  </label>
                  <textarea
                    rows={3}
                    value={analystNotes}
                    onChange={(e) => setAnalystNotes(e.target.value)}
                    placeholder="Provide specific rationale based on portfolio concentration, loss severity, and mitigating collateral guarantees..."
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                {decisionSuccess && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Decision recorded in Immutable Audit Log: Event ID <strong>{decisionSuccess.event_id}</strong></span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setInvestigateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={submittingDecision}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingDecision ? 'Recording Event...' : 'Sign Off & Log to Audit Ledger'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Admin Facility Risk Configuration Modal */}
      {/* ========================================================================= */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Facility Risk Configuration</h3>
                  <p className="text-xs text-slate-400">Configure risk tier boundaries and alert trigger floors (Admin only)</p>
                </div>
              </div>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Low Risk Ceiling (0 - X)</label>
                  <input
                    type="number"
                    value={adminConfig.low_threshold}
                    onChange={(e) => setAdminConfig({ ...adminConfig, low_threshold: parseInt(e.target.value) || 30 })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Moderate Risk Ceiling</label>
                  <input
                    type="number"
                    value={adminConfig.moderate_threshold}
                    onChange={(e) => setAdminConfig({ ...adminConfig, moderate_threshold: parseInt(e.target.value) || 60 })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">High Risk Ceiling</label>
                  <input
                    type="number"
                    value={adminConfig.high_threshold}
                    onChange={(e) => setAdminConfig({ ...adminConfig, high_threshold: parseInt(e.target.value) || 80 })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Facility Alert Floor</label>
                  <input
                    type="number"
                    value={adminConfig.alert_threshold}
                    onChange={(e) => setAdminConfig({ ...adminConfig, alert_threshold: parseInt(e.target.value) || 65 })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">Enable Facility Risk Alarms</span>
                  <p className="text-[11px] text-slate-400">Generate alerts in the Risk Alerts stream when risk crosses threshold</p>
                </div>
                <input
                  type="checkbox"
                  checked={adminConfig.alerts_enabled}
                  onChange={(e) => setAdminConfig({ ...adminConfig, alerts_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-800"
                />
              </div>

              {configSuccess && (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-center font-bold">
                  ✓ Configuration thresholds updated and saved to audit ledger!
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors disabled:opacity-50"
                >
                  {savingConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
