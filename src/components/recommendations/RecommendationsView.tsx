import React from 'react';
import {
  Lightbulb,
  AlertTriangle,
  Clock,
  Package,
  Sprout,
  CloudRain,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { db } from '../../services/storage';
import { NavItemKey } from '../layout/Sidebar';

interface RecommendationsViewProps {
  onNavigate: (tab: NavItemKey) => void;
}

export function RecommendationsView({ onNavigate }: RecommendationsViewProps) {
  const recommendations = db.getRecommendations();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-white border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Module J: Intelligence Engine</span>
          <span>·</span>
          <span>Rule-Based Agronomic Advisories</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Rule-Based Operational & Agronomic Recommendations
        </h2>
        <p className="text-xs text-slate-600 mt-0.5">
          Transparent, deterministic business logic inspecting crop phenology stages, overdue tasks, warehouse input thresholds, and local microclimate risks.
        </p>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.map(rec => {
          let icon = <Lightbulb className="w-5 h-5 text-amber-600" />;
          let borderClass = 'border-slate-200 bg-white';

          if (rec.type === 'task_overdue') {
            icon = <Clock className="w-5 h-5 text-rose-600" />;
            borderClass = 'border-rose-200 bg-rose-50/40';
          } else if (rec.type === 'low_inventory') {
            icon = <Package className="w-5 h-5 text-amber-600" />;
            borderClass = 'border-amber-200 bg-amber-50/40';
          } else if (rec.type === 'harvest_due') {
            icon = <Sprout className="w-5 h-5 text-emerald-600" />;
            borderClass = 'border-emerald-200 bg-emerald-50/40';
          } else if (rec.type === 'weather_risk') {
            icon = <CloudRain className="w-5 h-5 text-sky-600" />;
            borderClass = 'border-sky-200 bg-sky-50/40';
          }

          return (
            <div
              key={rec.id}
              className={`p-5 rounded-xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${borderClass}`}
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 shrink-0">{icon}</div>
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
                      Rule Advisory
                    </span>
                    <span className="text-slate-300">·</span>
                    <span
                      className={`font-semibold uppercase tracking-wider text-[10px] ${
                        rec.priority === 'high' ? 'text-rose-700' : 'text-amber-700'
                      }`}
                    >
                      {rec.priority} Priority
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{rec.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    {rec.message}
                  </p>
                </div>
              </div>

              {rec.actionLabel && rec.actionModule && (
                <button
                  onClick={() => onNavigate(rec.actionModule as NavItemKey)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-xs"
                >
                  <span>{rec.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Architectural Design Principles Callout */}
      <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
          <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
          <span>Safety & Deterministic Rule Policy</span>
        </div>
        <p className="leading-relaxed">
          Agricultural advisory engines require absolute transparency and chemical safety guarantees. AgroPulse uses explicit rule evaluators for pest thresholds, nutrient chlorosis, and irrigation regimes. All suggestions are linked to verified Sri Lankan agronomic research standards rather than speculative ungrounded models.
        </p>
      </div>
    </div>
  );
}
