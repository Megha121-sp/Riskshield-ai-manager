import React, { useState } from 'react';
import {
  RotateCcw,
  Sparkles,
  User,
  Shield,
  Check,
  Zap,
  Activity
} from 'lucide-react';
import { demoAPI } from '../../services/api';

export default function Header({
  currentTab,
  onOpenScenarios,
  onDataReset,
  currentUser,
  onRoleSwitch
}) {
  const [resetting, setResetting] = useState(false);

  const titles = {
    overview: 'Risk Intelligence Overview',
    transactions: 'Transaction Risk Queue',
    alerts: 'Active Risk Alerts',
    investigations: 'AI Deep Investigations',
    fraud: 'Fraud Intelligence & Clusters',
    analytics: 'Financial ROI & Model Analytics',
    model: 'ML Model Performance & SHAP',
    audit: 'Immutable Audit Trail'
  };

  const handleReset = async () => {
    if (confirm('Reset and generate fresh 10,000+ synthetic demo transactions?')) {
      setResetting(true);
      try {
        await demoAPI.reset();
        if (onDataReset) onDataReset();
      } catch (e) {
        alert('Failed to reset demo data.');
      } finally {
        setResetting(false);
      }
    }
  };

  return (
    <header className="h-16 px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          {titles[currentTab] || 'Risk Dashboard'}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Scenario Launcher */}
        <button
          onClick={onOpenScenarios}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/40 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Launch Demo Scenarios</span>
        </button>

        {/* Reset Demo Data Button */}
        <button
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>{resetting ? 'Generating...' : 'Reset 10k Data'}</span>
        </button>

        {/* Role Toggle Switcher */}
        <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium">
          <button
            onClick={() => onRoleSwitch && onRoleSwitch('ANALYST')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              currentUser?.role === 'ANALYST'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Analyst
          </button>
          <button
            onClick={() => onRoleSwitch && onRoleSwitch('ADMIN')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              currentUser?.role === 'ADMIN'
                ? 'bg-purple-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Admin
          </button>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-xs">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <div className="font-semibold text-slate-200">{currentUser?.username?.split('@')[0] || 'analyst'}</div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">{currentUser?.role || 'ANALYST'}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
