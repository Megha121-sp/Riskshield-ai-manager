import React from 'react';
import RiskBadge from '../common/RiskBadge';

export default function ScoreGauge({ score = 0, level = 'LOW', subScores = {} }) {
  const normalizedScore = Math.min(100, Math.max(0, score));

  // Determine gauge color
  let strokeColor = '#10b981'; // emerald
  let glowClass = 'glow-emerald';
  if (normalizedScore > 70) {
    strokeColor = '#ef4444'; // rose
    glowClass = 'glow-rose';
  } else if (normalizedScore > 30) {
    strokeColor = '#f59e0b'; // amber
    glowClass = 'glow-amber';
  }

  // SVG Gauge calculations
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference * 0.75;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-135" viewBox="0 0 160 160">
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#1e293b"
            strokeWidth="12"
            strokeDasharray={circumference * 0.75}
            strokeDashoffset="0"
            fill="transparent"
            strokeLinecap="round"
          />
          {/* Active Meter */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={strokeColor}
            strokeWidth="12"
            strokeDasharray={circumference * 0.75}
            strokeDashoffset={strokeDashoffset}
            fill="transparent"
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
            {normalizedScore}
          </span>
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            / 100 Risk Score
          </span>
          <div className="mt-2">
            <RiskBadge level={level} showScore={false} size="sm" />
          </div>
        </div>
      </div>

      {/* Sub-signals Breakdown */}
      {subScores && Object.keys(subScores).length > 0 && (
        <div className="w-full mt-6 space-y-2 pt-4 border-t border-slate-800/80">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">ML Fraud Probability</span>
            <span className="font-mono font-semibold text-slate-200">{subScores.fraud_probability !== undefined ? `${(subScores.fraud_probability * 100).toFixed(1)}%` : '—'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Isolation Forest Anomaly</span>
            <span className="font-mono font-semibold text-slate-200">{subScores.anomaly_score !== undefined ? `${(subScores.anomaly_score * 100).toFixed(1)}%` : '—'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Velocity Signal Risk</span>
            <span className="font-mono font-semibold text-slate-200">{subScores.velocity_score !== undefined ? `${subScores.velocity_score}/100` : '—'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Behavioural Deviation</span>
            <span className="font-mono font-semibold text-slate-200">{subScores.behavioural_score !== undefined ? `${subScores.behavioural_score}/100` : '—'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Device Hardware Signature</span>
            <span className="font-mono font-semibold text-slate-200">{subScores.device_score !== undefined ? `${subScores.device_score}/100` : '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
