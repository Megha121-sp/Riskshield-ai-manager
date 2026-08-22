export const RISK_LEVELS = {
  LOW: {
    label: 'Low Risk',
    color: 'emerald',
    badgeClass: 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60',
    dotClass: 'bg-emerald-400',
    barClass: 'bg-emerald-500'
  },
  MEDIUM: {
    label: 'Medium Risk',
    color: 'amber',
    badgeClass: 'bg-amber-950/80 text-amber-400 border border-amber-800/60',
    dotClass: 'bg-amber-400',
    barClass: 'bg-amber-500'
  },
  HIGH: {
    label: 'High Risk',
    color: 'rose',
    badgeClass: 'bg-rose-950/80 text-rose-400 border border-rose-800/60',
    dotClass: 'bg-rose-400',
    barClass: 'bg-rose-500'
  }
};

export const STATUS_STYLES = {
  SUCCESS: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50',
  APPROVED: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50',
  HELD: 'bg-rose-950/60 text-rose-400 border border-rose-800/50',
  BLOCKED: 'bg-red-950/60 text-red-400 border border-red-800/50',
  REVIEW: 'bg-amber-950/60 text-amber-400 border border-amber-800/50',
  PENDING: 'bg-slate-800 text-slate-300 border border-slate-700',
  FAILED: 'bg-slate-800 text-slate-400 border border-slate-700'
};

export const PAYMENT_METHOD_ICONS = {
  UPI: 'Smartphone',
  CREDIT_CARD: 'CreditCard',
  DEBIT_CARD: 'CreditCard',
  NET_BANKING: 'Building2',
  WALLET: 'Wallet'
};
