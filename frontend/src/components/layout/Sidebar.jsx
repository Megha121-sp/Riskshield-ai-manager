import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  ShieldAlert,
  SearchCode,
  Network,
  BarChart3,
  Sliders,
  FileClock,
  ShieldCheck,
  Zap,
  Landmark
} from 'lucide-react';

export default function Sidebar({ currentTab, setTab, onOpenScenarios, alertCount = 0 }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'facilities', label: 'Facility Risk', icon: Landmark },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'alerts', label: 'Risk Alerts', icon: ShieldAlert, badge: alertCount },
    { id: 'investigations', label: 'Investigations', icon: SearchCode },
    { id: 'fraud', label: 'Fraud Intelligence', icon: Network },
    { id: 'analytics', label: 'Analytics & ROI', icon: BarChart3 },
    { id: 'model', label: 'Model Performance', icon: Sliders },
    { id: 'audit', label: 'Audit Logs', icon: FileClock },
  ];


  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              RISKSHIELD <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">AI</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Payment Risk Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="px-3 py-4 flex-1 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Risk Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isActive ? 'bg-indigo-900 text-indigo-200' : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Demo Scenarios Action */}
        <div className="pt-4">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Interactive Demos
          </div>
          <button
            onClick={onOpenScenarios}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-800/50 hover:bg-amber-900/40 transition-colors shadow-sm"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>8 Test Scenarios</span>
          </button>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between">
          <span>Engine Status</span>
          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-500 truncate">
          Active: XGBoost + TreeSHAP v1.0
        </div>
      </div>
    </aside>
  );
}
