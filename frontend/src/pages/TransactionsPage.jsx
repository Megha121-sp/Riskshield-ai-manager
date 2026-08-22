import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Plus
} from 'lucide-react';
import { transactionsAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function TransactionsPage({ onOpenTransaction }) {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('');
  const [skip, setSkip] = useState(0);
  const limit = 15;

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {
        limit,
        skip,
        search: search.trim() || undefined,
        risk_level: riskLevel || undefined,
        payment_method: paymentMethod || undefined,
        status: status || undefined
      };
      const res = await transactionsAPI.list(params);
      setTransactions(res.transactions || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [skip, riskLevel, paymentMethod, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSkip(0);
    fetchTransactions();
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <div className="space-y-5 pb-12">
      {/* Header / Search Controls */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl glass-card space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Transaction ID, Customer, Device, IP, or Merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </form>

          <button
            onClick={fetchTransactions}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Risk Level Filter */}
          <select
            value={riskLevel}
            onChange={(e) => { setRiskLevel(e.target.value); setSkip(0); }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="">All Risk Tiers</option>
            <option value="LOW">Low Risk (0-30)</option>
            <option value="MEDIUM">Medium Risk (31-70)</option>
            <option value="HIGH">High Risk (71-100)</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentMethod}
            onChange={(e) => { setPaymentMethod(e.target.value); setSkip(0); }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="">All Payment Methods</option>
            <option value="UPI">UPI</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="DEBIT_CARD">Debit Card</option>
            <option value="NET_BANKING">Net Banking</option>
            <option value="WALLET">Wallet</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setSkip(0); }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="APPROVED">APPROVED</option>
            <option value="HELD">HELD</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="REVIEW">REVIEW</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
          </select>

          {(search || riskLevel || paymentMethod || status) && (
            <button
              onClick={() => { setSearch(''); setRiskLevel(''); setPaymentMethod(''); setStatus(''); setSkip(0); }}
              className="text-xs text-rose-400 hover:underline font-semibold ml-auto"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl glass-card overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Retrieving scored transactions..." size="md" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Merchant Category</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No matching transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr
                      key={tx.transaction_id}
                      onClick={() => onOpenTransaction(tx.transaction_id)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 group-hover:text-indigo-300">
                        {tx.transaction_id}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {tx.customer_id}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {tx.payment_method}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 truncate max-w-[140px]">
                        {tx.merchant_category}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {formatDate(tx.timestamp)}
                      </td>
                      <td className="py-3.5 px-4">
                        <RiskBadge level={tx.risk_level} score={tx.risk_score} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTransaction(tx.transaction_id);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{transactions.length > 0 ? skip + 1 : 0}</strong> to{' '}
            <strong className="text-white">{Math.min(skip + limit, total)}</strong> of{' '}
            <strong className="text-white">{total}</strong> transactions
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSkip(Math.max(0, skip - limit))}
              disabled={skip === 0}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-slate-300 px-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setSkip(skip + limit)}
              disabled={skip + limit >= total}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
