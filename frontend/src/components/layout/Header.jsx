import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  Sparkles,
  User,
  Shield,
  Search,
  Bell,
  Bot,
  Server,
  Activity,
  ArrowRight,
  X,
  CreditCard,
  Smartphone,
  AlertTriangle
} from 'lucide-react';
import { demoAPI, searchAPI } from '../../services/api';
import NotificationCenter from '../notifications/NotificationCenter';
import SystemHealthModal from '../system/SystemHealthModal';
import { formatCurrency } from '../../utils/formatters';

export default function Header({
  currentTab,
  onOpenScenarios,
  onDataReset,
  currentUser,
  onRoleSwitch,
  onOpenCopilot,
  onOpenTransaction,
  onOpenCustomer,
  onOpenDevice,
  onNavigateTab
}) {
  const [resetting, setResetting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const searchRef = useRef(null);

  const titles = {
    overview: 'Risk Command Center',
    transactions: 'Transaction Risk Queue',
    alerts: 'Active Risk Alerts',
    investigations: 'AI Deep Investigations',
    fraud: 'Fraud Intelligence & Clusters',
    analytics: 'Financial ROI & Executive Scorecard',
    model: 'ML Model Performance & SHAP',
    audit: 'Immutable Audit Trail'
  };

  // Debounced search query
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchAPI.query(searchQuery.trim());
        setSearchResults(res.results || null);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search query failed:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <header className="h-16 px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-40 gap-4">
      {/* Title */}
      <div className="flex items-center gap-3 shrink-0">
        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
          {titles[currentTab] || 'Risk Command Center'}
        </h2>
      </div>

      {/* Global Search Bar */}
      <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Global search (TXN_..., USR_..., DEV_..., IP, Alert)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults) setShowSearchDropdown(true);
            }}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
                setShowSearchDropdown(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchDropdown && searchResults && (
          <div className="absolute left-0 right-0 top-10 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto p-3 space-y-3 animate-fade-in text-xs">
            {/* Transactions Group */}
            {searchResults.transactions?.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block px-1">Transactions</span>
                {searchResults.transactions.slice(0, 3).map((t) => (
                  <div
                    key={t.transaction_id}
                    onClick={() => {
                      if (onOpenTransaction) onOpenTransaction(t.transaction_id);
                      setShowSearchDropdown(false);
                    }}
                    className="p-2 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-mono font-bold text-white">{t.transaction_id}</span>
                      <span className="text-slate-400">({t.customer_id})</span>
                    </div>
                    <span className="font-mono text-white font-semibold">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Customers Group */}
            {searchResults.customers?.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block px-1">Customers</span>
                {searchResults.customers.slice(0, 3).map((c) => (
                  <div
                    key={c.customer_id}
                    onClick={() => {
                      if (onOpenCustomer) onOpenCustomer(c.customer_id);
                      setShowSearchDropdown(false);
                    }}
                    className="p-2 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-mono font-bold text-white">{c.customer_id}</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{c.account_age_days}d active</span>
                  </div>
                ))}
              </div>
            )}

            {/* Devices Group */}
            {searchResults.devices?.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block px-1">Hardware Devices</span>
                {searchResults.devices.slice(0, 3).map((d) => (
                  <div
                    key={d.device_id}
                    onClick={() => {
                      if (onOpenDevice) onOpenDevice(d.device_id);
                      setShowSearchDropdown(false);
                    }}
                    className="p-2 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono font-bold text-white truncate max-w-[180px]">{d.device_id}</span>
                    </div>
                    <span className="text-[10px] font-mono text-rose-400 font-bold">{d.distinct_accounts_count} accounts</span>
                  </div>
                ))}
              </div>
            )}

            {/* Alerts Group */}
            {searchResults.alerts?.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block px-1">Risk Alerts</span>
                {searchResults.alerts.slice(0, 2).map((a) => (
                  <div
                    key={a.alert_id}
                    onClick={() => {
                      if (onNavigateTab) onNavigateTab('alerts');
                      setShowSearchDropdown(false);
                    }}
                    className="p-2 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span className="font-semibold text-white truncate">{a.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{a.severity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Risk Copilot Trigger */}
        <button
          onClick={onOpenCopilot}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-200 bg-indigo-950/70 border border-indigo-700/60 hover:bg-indigo-900/80 shadow-md shadow-indigo-950/50 transition-all group"
        >
          <Bot className="w-4 h-4 text-indigo-400 group-hover:animate-pulse" />
          <span className="hidden sm:inline">Risk Copilot</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
          </button>
          <NotificationCenter
            isOpen={notifOpen}
            onClose={() => setNotifOpen(false)}
            onNavigate={(tab) => {
              if (onNavigateTab) onNavigateTab(tab);
            }}
          />
        </div>

        {/* System Health Diagnostic Trigger */}
        <button
          onClick={() => setHealthOpen(true)}
          className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 transition-colors hidden sm:block"
          title="System Diagnostic Health"
        >
          <Server className="w-4 h-4" />
        </button>

        {/* Demo Scenarios */}
        <button
          onClick={onOpenScenarios}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/40 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Demo Scenarios</span>
        </button>

        {/* Reset Demo Data */}
        <button
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 hidden lg:flex"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>{resetting ? '...' : 'Reset 10k'}</span>
        </button>

        {/* Role Toggle Switcher */}
        <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium">
          <button
            onClick={() => onRoleSwitch && onRoleSwitch('ANALYST')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              currentUser?.role === 'ANALYST'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Analyst
          </button>
          <button
            onClick={() => onRoleSwitch && onRoleSwitch('ADMIN')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              currentUser?.role === 'ADMIN'
                ? 'bg-purple-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Admin
          </button>
        </div>
      </div>

      {/* Health Modal */}
      <SystemHealthModal
        isOpen={healthOpen}
        onClose={() => setHealthOpen(false)}
      />
    </header>
  );
}
