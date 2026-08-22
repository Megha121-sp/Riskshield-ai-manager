import React from 'react';
import { RISK_LEVELS } from '../../utils/constants';

export default function RiskBadge({ level, score, showScore = true, size = 'md' }) {
  const normalizedLevel = (level || 'LOW').toUpperCase();
  const config = RISK_LEVELS[normalizedLevel] || RISK_LEVELS.LOW;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  }[size] || 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${config.badgeClass} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass} animate-pulse`} />
      <span>{config.label}</span>
      {showScore && score !== undefined && (
        <span className="opacity-75 font-mono text-[10px] ml-0.5">({score})</span>
      )}
    </span>
  );
}
