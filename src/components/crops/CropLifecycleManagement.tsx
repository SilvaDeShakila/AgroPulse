import React, { useState } from 'react';
import {
  Sprout,
  Plus,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { db } from '../../services/storage';
import { CropCycle, GrowthStage, CropSeason } from '../../types';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

const GROWTH_STAGES: GrowthStage[] = [
  'Land Preparation',
  'Sowing / Nursery',
  'Vegetative Growth',
  'Flowering / Tillering',
  'Fruiting / Grain Fill',
  'Ripening',
  'Harvest Ready',
  'Harvested',
];

export function CropLifecycleManagement() {
  const { showToast } = useToast();
  const farms = db.getFarms();
  const [selectedFarmId, setSelectedFarmId] = useState<string>(farms[0]?.id || '');
  const [isAddCycleOpen, setIsAddCycleOpen] = useState(false);
  const [selectedCycleForDetails, setSelectedCycleForDetails] = useState<CropCycle | null>(null);

  // Form states
  const [cropName, setCropName] = useState('');
  const [variety, setVariety] = useState('');
  const [category, setCategory] = useState<CropCycle['category']>('Vegetables');
  const [season, setSeason] = useState<CropSeason>('Maha (Major Monsoon)');
  const [plotId, setPlotId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [harvestDate, setHarvestDate] = useState('');
  const [targetYield, setTargetYield] = useState(5000);
  const [notes, setNotes] = useState('');

  const cycles = db.getCropCycles(selectedFarmId);
  const plots = db.getPlots(selectedFarmId);
  const observations = db.getObservations(selectedFarmId);

  const handleAdvanceStage = (cycle: CropCycle) => {
    const currentIndex = GROWTH_STAGES.indexOf(cycle.stage);
    if (currentIndex < GROWTH_STAGES.length - 1) {
      const nextStage = GROWTH_STAGES[currentIndex + 1];
      const isCompleted = nextStage === 'Harvested';
      db.updateCropCycle(cycle.id, {
        stage: nextStage,
        status: isCompleted ? 'completed' : 'in_progress',
        actualHarvestDate: isCompleted ? new Date().toISOString().split('T')[0] : cycle.actualHarvestDate,
      });
      showToast('success', 'Stage Advanced', `"${cycle.cropName}" progressed to ${nextStage}.`);
    }
  };

  const handleCreateCycle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropName || !variety || !plotId) {
      showToast('error', 'Validation Error', 'Crop name, variety, and target plot are required.');
      return;
    }

    const newCycle = db.addCropCycle({
      farmId: selectedFarmId,
      plotId,
      cropName,
      variety,
      category,
      season,
      startDate,
      expectedHarvestDate: harvestDate || '2026-12-31',
      stage: 'Land Preparation',
      targetYieldKg: Number(targetYield),
      status: 'in_progress',
      notes,
    });

    // Update plot current cycle
    db.updatePlot(plotId, { currentCropCycleId: newCycle.id, status: 'cultivated' });

    showToast('success', 'Crop Cycle Started', `Initiated "${cropName} (${variety})" on selected plot.`);
    setIsAddCycleOpen(false);
    setCropName('');
    setVariety('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Module C: Crop Lifecycle</span>
            <span>·</span>
            <span>Maha & Yala Phenology</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Crop Lifecycle & Phenology Management
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Track multi-stage growth progress, agronomist disease logs, and seasonal yield targets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedFarmId}
            onChange={e => setSelectedFarmId(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg"
          >
            {farms.map(f => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setPlotId(plots[0]?.id || '');
              setIsAddCycleOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Start New Crop Cycle</span>
          </button>
        </div>
      </div>

      {/* Active Crop Cycles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cycles.map(cycle => {
          const plot = plots.find(p => p.id === cycle.plotId);
          const cycleObservations = observations.filter(o => o.cropCycleId === cycle.id);
          const currentStageIdx = GROWTH_STAGES.indexOf(cycle.stage);
          const progressPercent = Math.round(((currentStageIdx + 1) / GROWTH_STAGES.length) * 100);

          return (
            <div
              key={cycle.id}
              className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-semibold text-[#1B4332] bg-[#E8F5EE] px-2.5 py-0.5 rounded">
                    {cycle.season}
                  </span>
                  <span className="font-mono tabular-nums text-slate-600">
                    Target: {cycle.targetYieldKg.toLocaleString()} kg
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{cycle.cropName}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Variety: <strong className="text-slate-800">{cycle.variety}</strong> · Plot: {plot?.name || 'Assigned Sector'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded uppercase tracking-wider bg-slate-100 text-slate-700">
                    {cycle.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Growth Stage Stepper Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-800">
                      Current Stage: <span className="text-[#2D6A4F]">{cycle.stage}</span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 text-[11px]">
                      {progressPercent}% Complete
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#2D6A4F] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Started: {cycle.startDate}</span>
                    <span>Expected Harvest: {cycle.expectedHarvestDate}</span>
                  </div>
                </div>

                {/* Agronomic Observations for this cycle */}
                {cycleObservations.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Agronomy Note: {cycleObservations[0].title}</span>
                    </div>
                    <p className="text-[11px] text-amber-900">{cycleObservations[0].description}</p>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-mono">
                  {cycle.actualYieldKg ? `Actual: ${cycle.actualYieldKg.toLocaleString()} kg` : 'Yield Pending'}
                </span>

                <div className="flex items-center gap-2">
                  {currentStageIdx < GROWTH_STAGES.length - 1 && (
                    <button
                      onClick={() => handleAdvanceStage(cycle)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span>Advance Stage</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Start New Crop Cycle */}
      {isAddCycleOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddCycleOpen(false)}
          title="Initiate New Crop Cycle"
          description="Register a crop planting on a designated land plot"
        >
          <form onSubmit={handleCreateCycle} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Crop Name</label>
              <input
                type="text"
                value={cropName}
                onChange={e => setCropName(e.target.value)}
                placeholder="e.g. Ceylon BOPF Tea or Heirloom Keeri Samba"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Variety / Cultivar</label>
                <input
                  type="text"
                  value={variety}
                  onChange={e => setVariety(e.target.value)}
                  placeholder="e.g. TRI 2025 or Bg 352"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Commercial Plantation">Commercial Plantation</option>
                  <option value="Paddy & Grains">Paddy & Grains</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Spices">Spices</option>
                  <option value="Fruits">Fruits</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cultivation Season</label>
                <select
                  value={season}
                  onChange={e => setSeason(e.target.value as CropSeason)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Maha (Major Monsoon)">Maha (Major Monsoon)</option>
                  <option value="Yala (Minor Monsoon)">Yala (Minor Monsoon)</option>
                  <option value="Intermediate / Year-Round">Intermediate / Year-Round</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Designated Land Plot</label>
                <select
                  value={plotId}
                  onChange={e => setPlotId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  {plots.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.plotCode}) - {p.area} {p.areaUnit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sowing / Planting Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Expected Harvest Date</label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={e => setHarvestDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target Harvest Yield (kg)
              </label>
              <input
                type="number"
                min="100"
                value={targetYield}
                onChange={e => setTargetYield(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Agronomic Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Specific soil preparation or biochar dosing guidelines..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddCycleOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
              >
                Launch Cycle
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
