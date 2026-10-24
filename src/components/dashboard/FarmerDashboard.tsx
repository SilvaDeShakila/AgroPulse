import React from 'react';
import {
  Trees,
  Sprout,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  Coins,
  CloudSun,
  Package,
  ArrowUpRight,
  MapPin,
  Calendar
} from 'lucide-react';
import { db } from '../../services/storage';
import { StatCard } from '../common/Modal';
import { NavItemKey } from '../layout/Sidebar';
import { useToast } from '../common/Toast';

interface FarmerDashboardProps {
  onNavigate: (tab: NavItemKey) => void;
}

export function FarmerDashboard({ onNavigate }: FarmerDashboardProps) {
  const { showToast } = useToast();
  const farms = db.getFarms();
  const plots = db.getPlots();
  const cycles = db.getCropCycles();
  const tasks = db.getTasks();
  const inventory = db.getInventory();
  const financialSummary = db.getFinancialSummary();
  const recommendations = db.getRecommendations();
  const primaryFarm = farms[0] || { name: 'Main Plantation', district: 'Nuwara Eliya' };
  const weather = db.getWeatherForDistrict(primaryFarm.district);

  const overdueTasks = tasks.filter(t => t.status === 'overdue');
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const lowStockItems = inventory.filter(i => i.currentStock <= i.minReorderLevel);

  const handleQuickCompleteTask = (taskId: string, title: string) => {
    db.updateTask(taskId, {
      status: 'completed',
      completionNotes: 'Marked completed from Farmer Dashboard quick dispatch.',
    });
    showToast('success', 'Task Completed', `Field operation "${title}" is now recorded as completed.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Farm Selector & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-[#1B4332]">{farms.length} Registered Estates</span>
            <span>·</span>
            <span>{plots.length} Cultivated Plots</span>
            <span>·</span>
            <span>Maha & Yala Seasonal Overview</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {primaryFarm.name}
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {primaryFarm.district} District ({primaryFarm.province})
            </span>
            <span>·</span>
            <span className="font-mono tabular-nums">{primaryFarm.totalArea} {primaryFarm.areaUnit}</span>
            <span>·</span>
            <span className="text-[#2D6A4F] font-medium">{primaryFarm.soilPrimary}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('crops')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Sprout className="w-3.5 h-3.5 text-[#52B788]" />
            <span>Manage Crops</span>
          </button>
          <button
            onClick={() => onNavigate('finance')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Coins className="w-3.5 h-3.5 text-slate-500" />
            <span>Financials</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Crop Cycles"
          value={cycles.filter(c => c.status === 'in_progress').length}
          subtext={`${cycles.length} total cycles recorded`}
          icon={<Sprout className="w-5 h-5" />}
        />
        <StatCard
          label="Pending Field Tasks"
          value={pendingTasks.length}
          subtext={`${overdueTasks.length} currently overdue`}
          trend={overdueTasks.length > 0 ? `${overdueTasks.length} Overdue` : 'On Schedule'}
          trendPositive={overdueTasks.length === 0}
          icon={<CheckSquare className="w-5 h-5" />}
        />
        <StatCard
          label="Estimated Gross Revenue"
          value={`LKR ${(financialSummary.totalRevenue / 1000000).toFixed(2)}M`}
          subtext={`From ${financialSummary.harvestCount} logged harvest flushes`}
          trend={`+${financialSummary.profitMargin}% Margin`}
          trendPositive={financialSummary.profitMargin > 0}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Low Stock Alerts"
          value={lowStockItems.length}
          subtext="Requires reordering"
          trend={lowStockItems.length > 0 ? 'Action Needed' : 'Nominal'}
          trendPositive={lowStockItems.length === 0}
          icon={<Package className="w-5 h-5" />}
        />
      </div>

      {/* Main Grid: Weather + Field Tasks + Land Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 cols: Field Tasks and Land Plots */}
        <div className="lg:col-span-8 space-y-6">
          {/* Actionable Field Tasks */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#2D6A4F]" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Priority Field Operations
                </h3>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-[#2D6A4F] hover:underline flex items-center gap-1 font-medium"
              >
                <span>View all tasks</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.slice(0, 4).map(task => {
                const isOverdue = task.status === 'overdue';
                return (
                  <div key={task.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-semibold uppercase tracking-wider text-[10px] ${
                            isOverdue
                              ? 'text-rose-600 font-bold'
                              : task.priority === 'urgent'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 capitalize">{task.category}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due {task.dueDate}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 mt-1 truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Assigned to: <strong className="text-slate-700">{task.assignedToName || 'Unassigned'}</strong>
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {task.status !== 'completed' ? (
                        <button
                          onClick={() => handleQuickCompleteTask(task.id, task.title)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#1B4332] bg-[#E8F5EE] hover:bg-[#D8F3DC] rounded border border-[#B7E4C7] transition-colors"
                        >
                          Complete
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-700 font-medium">Done</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plots & Crop Cycles Status Grid */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Trees className="w-4 h-4 text-[#2D6A4F]" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Land Plots & Crop Progress
                </h3>
              </div>
              <button
                onClick={() => onNavigate('farms')}
                className="text-xs text-[#2D6A4F] hover:underline flex items-center gap-1 font-medium"
              >
                <span>Plot Infrastructure</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {plots.map(plot => {
                const cycle = cycles.find(c => c.id === plot.currentCropCycleId);
                return (
                  <div
                    key={plot.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-[#FBFBFA] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span className="font-mono font-semibold text-slate-700">{plot.plotCode}</span>
                        <span className="font-mono tabular-nums">{plot.area} {plot.areaUnit}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{plot.name}</p>
                      <p className="text-xs text-slate-600 mt-0.5 truncate">{plot.irrigationType}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      {cycle ? (
                        <>
                          <span className="font-medium text-[#1B4332] truncate">
                            {cycle.cropName}
                          </span>
                          <span className="text-[11px] font-semibold text-[#2D6A4F] bg-[#E8F5EE] px-2 py-0.5 rounded">
                            {cycle.stage}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Fallow / Ready for Planting</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 4 cols: Microclimate & Rule Recommendations */}
        <div className="lg:col-span-4 space-y-6">
          {/* Weather Widget */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  {weather.district} Microclimate
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Radar
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums font-mono">
                  {weather.temperatureC}°C
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Feels like {weather.feelsLikeC}°C · {weather.condition}
                </p>
              </div>
              <div className="text-right text-xs text-slate-600 space-y-1 font-mono tabular-nums">
                <p>Humidity: <strong className="text-slate-900">{weather.humidityPercent}%</strong></p>
                <p>Precip: <strong className="text-slate-900">{weather.rainfallMm} mm</strong></p>
                <p>Wind: <strong className="text-slate-900">{weather.windSpeedKmh} km/h</strong></p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-sky-50 border border-sky-100 text-xs text-sky-950 leading-relaxed">
              <strong className="block font-semibold mb-0.5">Agronomic Advisory:</strong>
              {weather.agriculturalAdvisory}
            </div>

            <button
              onClick={() => onNavigate('weather')}
              className="mt-3 w-full py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-center block"
            >
              Open Detailed 5-Day Radar &rarr;
            </button>
          </div>

          {/* Operational Recommendations Engine */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Rule-Based Advisories
                </h3>
              </div>
              <button
                onClick={() => onNavigate('recommendations')}
                className="text-xs text-[#2D6A4F] hover:underline font-medium"
              >
                All
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {recommendations.slice(0, 3).map(rec => (
                <div
                  key={rec.id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <p className="font-semibold text-slate-900">{rec.title}</p>
                  <p className="text-[11px] text-slate-600 leading-normal">{rec.message}</p>
                  {rec.actionLabel && rec.actionModule && (
                    <button
                      onClick={() => onNavigate(rec.actionModule as NavItemKey)}
                      className="text-[11px] font-semibold text-[#1B4332] hover:underline pt-1 block"
                    >
                      {rec.actionLabel} &rarr;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
