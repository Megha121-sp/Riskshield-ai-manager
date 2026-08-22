import React from 'react';
import { ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

export default function ShapWaterfall({ factors = [] }) {
  if (!factors || factors.length === 0) {
    return (
      <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-slate-400 text-sm">
        No specific feature deviations identified. Standard baseline model prediction.
      </div>
    );
  }

  // Find max absolute impact to scale bars
  const maxImpact = Math.max(...factors.map(f => Math.abs(f.impact || 0)), 0.1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
        <span>Risk Factor / Feature</span>
        <span>SHAP Impact Contribution</span>
      </div>

      <div className="space-y-2.5">
        {factors.map((factor, idx) => {
          const impact = factor.impact || 0;
          const isElevating = impact > 0;
          const pctWidth = Math.min(100, (Math.abs(impact) / maxImpact) * 100);

          return (
            <div
              key={idx}
              className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-200">
                      {factor.feature}
                    </span>
                    {factor.value !== undefined && factor.value !== null && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-400">
                        val: {String(factor.value)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    {factor.description || 'Feature contribution to risk model output'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isElevating ? (
                    <div className="flex items-center gap-1 text-rose-400 font-mono text-xs font-bold">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      +{impact.toFixed(3)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-400 font-mono text-xs font-bold">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      {impact.toFixed(3)}
                    </div>
                  )}
                </div>
              </div>

              {/* Impact Bar Visualizer */}
              <div className="mt-2.5 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                {isElevating ? (
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${pctWidth}%` }}
                  />
                ) : (
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${pctWidth}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
