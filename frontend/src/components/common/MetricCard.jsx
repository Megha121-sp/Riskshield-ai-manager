import React from 'react';
import * as Icons from 'lucide-react';

export default function MetricCard({
  title,
  value,
  subtitle,
  iconName,
  trend,
  trendPositive,
  variant = 'default'
}) {
  const IconComponent = Icons[iconName] || Icons.Activity;

  const variantStyles = {
    default: 'border-slate-800 bg-slate-900/60',
    danger: 'border-rose-900/50 bg-rose-950/20 text-rose-300',
    warning: 'border-amber-900/50 bg-amber-950/20 text-amber-300',
    success: 'border-emerald-900/50 bg-emerald-950/20 text-emerald-300',
    indigo: 'border-indigo-900/50 bg-indigo-950/20 text-indigo-300'
  }[variant];

  return (
    <div className={`p-5 rounded-xl border glass-card glass-card-hover ${variantStyles}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className="p-2 rounded-lg bg-slate-800/80 text-indigo-400">
          <IconComponent className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${trendPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-400 truncate">{subtitle}</p>
      )}
    </div>
  );
}
