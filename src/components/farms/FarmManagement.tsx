import React, { useState } from 'react';
import {
  Trees,
  Plus,
  MapPin,
  Compass,
  Layers,
  Droplet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { db } from '../../services/storage';
import { Farm, LandPlot, AreaUnit } from '../../types';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

import { FarmMapVisualizer } from './FarmMapVisualizer';

export function FarmManagement() {
  const { showToast } = useToast();
  const farms = db.getFarms();
  const [selectedFarmId, setSelectedFarmId] = useState<string>(farms[0]?.id || '');
  const [isAddFarmOpen, setIsAddFarmOpen] = useState(false);
  const [isAddPlotOpen, setIsAddPlotOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'cards'>('map');

  // Form states for New Farm
  const [farmName, setFarmName] = useState('');
  const [district, setDistrict] = useState('Nuwara Eliya');
  const [province, setProvince] = useState('Central Province');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState(25);
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('acres');
  const [soil, setSoil] = useState<Farm['soilPrimary']>('Red-Yellow Podzolic');
  const [irrigation, setIrrigation] = useState<Farm['irrigationPrimary']>('Sprinkler');

  // Form states for New Plot
  const [plotName, setPlotName] = useState('');
  const [plotCode, setPlotCode] = useState('');
  const [plotArea, setPlotArea] = useState(10);
  const [plotSoil, setPlotSoil] = useState('Red-Yellow Podzolic');
  const [plotIrrigation, setPlotIrrigation] = useState('Drip');

  const selectedFarm = farms.find(f => f.id === selectedFarmId) || farms[0];
  const plots = db.getPlots(selectedFarm?.id);
  const cycles = db.getCropCycles(selectedFarm?.id);

  const handleCreateFarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmName.trim()) {
      showToast('error', 'Validation Error', 'Farm name cannot be empty.');
      return;
    }

    const newFarm = db.addFarm({
      ownerId: db.getCurrentUser().id,
      name: farmName,
      district,
      province,
      address: address || `${district}, Sri Lanka`,
      latitude: district === 'Nuwara Eliya' ? 6.9744 : district === 'Anuradhapura' ? 8.3114 : 7.5412,
      longitude: district === 'Nuwara Eliya' ? 80.7828 : district === 'Anuradhapura' ? 80.4037 : 80.3891,
      totalArea: Number(area),
      areaUnit,
      soilPrimary: soil,
      irrigationPrimary: irrigation,
      assignedWorkers: ['user-worker-01'],
      status: 'active',
    });

    showToast('success', 'Farm Created', `"${newFarm.name}" in ${newFarm.district} registered.`);
    setIsAddFarmOpen(false);
    setSelectedFarmId(newFarm.id);
    setFarmName('');
    setAddress('');
  };

  const handleCreatePlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotName.trim() || !plotCode.trim()) {
      showToast('error', 'Validation Error', 'Plot name and code are required.');
      return;
    }

    const newPlot = db.addPlot({
      farmId: selectedFarm.id,
      name: plotName,
      plotCode,
      area: Number(plotArea),
      areaUnit: selectedFarm.areaUnit,
      soilType: plotSoil,
      irrigationType: plotIrrigation,
      status: 'cultivated',
    });

    showToast('success', 'Plot Registered', `Plot ${newPlot.plotCode} added to ${selectedFarm.name}.`);
    setIsAddPlotOpen(false);
    setPlotName('');
    setPlotCode('');
  };

  // Convert unit calculation for display
  const areaInHectares = (selectedFarm?.totalArea || 0) * (selectedFarm?.areaUnit === 'acres' ? 0.404686 : 1);
  const areaInAcres = (selectedFarm?.totalArea || 0) * (selectedFarm?.areaUnit === 'hectares' ? 2.47105 : 1);

  return (
    <div className="space-y-6">
      {/* Header with Selector & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Module B: Infrastructure</span>
            <span>·</span>
            <span>Farms & Plot Coordinates</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Agricultural Holdings & Plot Partitioning
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Manage estate boundaries, plot codes, soil classifications, and irrigation systems.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedFarmId}
            onChange={e => setSelectedFarmId(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
          >
            {farms.map(f => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.district})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsAddFarmOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Estate / Farm</span>
          </button>
        </div>
      </div>

      {selectedFarm && (
        <>
          {/* Selected Farm Information Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Estate Extent
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
                {selectedFarm.totalArea} {selectedFarm.areaUnit}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                ≈ {areaInHectares.toFixed(2)} ha / {areaInAcres.toFixed(1)} acres
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Geographic Zone
              </span>
              <p className="text-base font-bold text-slate-900 mt-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#2D6A4F]" />
                {selectedFarm.district}
              </p>
              <p className="text-xs text-slate-500 mt-1">{selectedFarm.province}</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Primary Soil Order
              </span>
              <p className="text-sm font-bold text-slate-900 mt-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#2D6A4F]" />
                {selectedFarm.soilPrimary}
              </p>
              <p className="text-xs text-slate-500 mt-1">Classified Sri Lankan Agro-Zone</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Irrigation System
              </span>
              <p className="text-sm font-bold text-slate-900 mt-2 flex items-center gap-1.5">
                <Droplet className="w-4 h-4 text-sky-600" />
                {selectedFarm.irrigationPrimary}
              </p>
              <p className="text-xs text-slate-500 mt-1">Water delivery architecture</p>
            </div>
          </div>

          {/* View Mode Switcher & Plot Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center p-1 bg-slate-200/80 rounded-lg self-start">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'map'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cadastral GIS Map Layout
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Plot Sector Cards ({plots.length})
              </button>
            </div>

            <button
              onClick={() => setIsAddPlotOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Land Plot</span>
            </button>
          </div>

          {viewMode === 'map' ? (
            <FarmMapVisualizer
              farm={selectedFarm}
              plots={plots}
              cycles={cycles}
              onSelectPlot={plot => {
                showToast('info', `Selected ${plot.plotCode}`, `${plot.name} (${plot.area} ${plot.areaUnit})`);
              }}
              onDispatchTaskForPlot={plot => {
                showToast('info', 'Dispatch Task', `Opening task dispatcher for ${plot.plotCode}.`);
              }}
            />
          ) : (
            <div className="p-5 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Land Plots Breakdown ({plots.length} Sectors)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sub-divided cadastral units managed under this farm
                  </p>
                </div>
              </div>

              {plots.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No land plots registered yet for this farm.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {plots.map(plot => {
                    const cycle = cycles.find(c => c.id === plot.currentCropCycleId);
                    return (
                      <div
                        key={plot.id}
                        className="p-4 rounded-xl border border-slate-200 bg-[#FBFBFA] flex flex-col justify-between hover:border-slate-300 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                            <span className="font-mono font-bold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded">
                              {plot.plotCode}
                            </span>
                            <span className="font-mono tabular-nums font-medium">
                              {plot.area} {plot.areaUnit}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900">{plot.name}</h4>
                          <div className="mt-2 space-y-1 text-xs text-slate-600">
                            <p className="truncate">
                              <strong className="text-slate-700">Soil:</strong> {plot.soilType}
                            </p>
                            <p className="truncate">
                              <strong className="text-slate-700">Irrigation:</strong> {plot.irrigationType}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                          {cycle ? (
                            <>
                              <div className="min-w-0">
                                <p className="font-medium text-[#1B4332] truncate">{cycle.cropName}</p>
                                <p className="text-[11px] text-slate-500">{cycle.variety}</p>
                              </div>
                              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-emerald-100 text-emerald-800 shrink-0">
                                {cycle.stage}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Fallow / Rested Soil
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: Add New Farm */}
      {isAddFarmOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddFarmOpen(false)}
          title="Register Agricultural Farm"
          description="Add a new agricultural property, plantation, or greenhouse facility"
        >
          <form onSubmit={handleCreateFarm} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Estate / Farm Name</label>
              <input
                type="text"
                value={farmName}
                onChange={e => setFarmName(e.target.value)}
                placeholder="e.g. Dambulla Highland Horticulture Farm"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">District</label>
                <select
                  value={district}
                  onChange={e => {
                    const d = e.target.value;
                    setDistrict(d);
                    if (d === 'Nuwara Eliya' || d === 'Kandy' || d === 'Matale') setProvince('Central Province');
                    else if (d === 'Anuradhapura' || d === 'Polonnaruwa') setProvince('North Central Province');
                    else if (d === 'Kurunegala' || d === 'Puttalam') setProvince('North Western Province');
                    else if (d === 'Badulla' || d === 'Monaragala') setProvince('Uva Province');
                    else setProvince('Western Province');
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Nuwara Eliya">Nuwara Eliya (Hill Country)</option>
                  <option value="Anuradhapura">Anuradhapura (Dry Zone)</option>
                  <option value="Kurunegala">Kurunegala (Intermediate Zone)</option>
                  <option value="Badulla">Badulla (Uva Highland)</option>
                  <option value="Polonnaruwa">Polonnaruwa (Dry Zone)</option>
                  <option value="Kandy">Kandy (Central)</option>
                  <option value="Matale">Matale (Spices)</option>
                  <option value="Colombo">Colombo (Western)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Province</label>
                <input
                  type="text"
                  value={province}
                  readOnly
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg text-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Total Extent</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={area}
                  onChange={e => setArea(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Area Unit</label>
                <select
                  value={areaUnit}
                  onChange={e => setAreaUnit(e.target.value as AreaUnit)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                  <option value="sq_meters">Square Meters</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Primary Soil Type</label>
                <select
                  value={soil}
                  onChange={e => setSoil(e.target.value as Farm['soilPrimary'])}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Red-Yellow Podzolic">Red-Yellow Podzolic (Highlands)</option>
                  <option value="Reddish Brown Earth">Reddish Brown Earth (Dry Zone)</option>
                  <option value="Alluvial">Alluvial (River Valleys)</option>
                  <option value="Latosolic">Latosolic (Red-Yellow Latosols)</option>
                  <option value="Regosol">Regosol (Sandy coastal/dune)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Primary Irrigation</label>
                <select
                  value={irrigation}
                  onChange={e => setIrrigation(e.target.value as Farm['irrigationPrimary'])}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Drip">Drip / Micro-fertigation</option>
                  <option value="Sprinkler">Overhead Sprinkler</option>
                  <option value="Furrow / Canal">Furrow / Tank Canal Sluice</option>
                  <option value="Tube Well">Deep Tube Well Pumping</option>
                  <option value="Rainfed">Rainfed Monsoon</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Street Address / Landmark</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g. Agronomy Rd, Gampola Valley"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddFarmOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
              >
                Register Farm
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Add Land Plot */}
      {isAddPlotOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddPlotOpen(false)}
          title={`Add Land Plot to ${selectedFarm?.name}`}
          description="Create a sub-plot partition for crop lifecycle tracking"
        >
          <form onSubmit={handleCreatePlot} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plot Name</label>
                <input
                  type="text"
                  value={plotName}
                  onChange={e => setPlotName(e.target.value)}
                  placeholder="e.g. South Terrace Block 3"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plot Code</label>
                <input
                  type="text"
                  value={plotCode}
                  onChange={e => setPlotCode(e.target.value.toUpperCase())}
                  placeholder="e.g. PL-ST-03"
                  required
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Plot Area ({selectedFarm?.areaUnit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={plotArea}
                  onChange={e => setPlotArea(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Irrigation Setup</label>
                <input
                  type="text"
                  value={plotIrrigation}
                  onChange={e => setPlotIrrigation(e.target.value)}
                  placeholder="e.g. Automated Drip lines"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Specific Soil Description</label>
              <input
                type="text"
                value={plotSoil}
                onChange={e => setPlotSoil(e.target.value)}
                placeholder="e.g. Well drained Sandy Loam with 4% organic humus"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddPlotOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
              >
                Save Plot
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
