import React, { useState } from 'react';
import {
  Layers,
  Droplet,
  Sprout,
  MapPin,
  CheckCircle2,
  Clock,
  Compass,
  Maximize2,
  Info,
  Calendar,
  Plus
} from 'lucide-react';
import { Farm, LandPlot, CropCycle } from '../../types';
import { db } from '../../services/storage';

interface FarmMapVisualizerProps {
  farm: Farm;
  plots: LandPlot[];
  cycles: CropCycle[];
  onSelectPlot?: (plot: LandPlot) => void;
  onDispatchTaskForPlot?: (plot: LandPlot) => void;
}

export function FarmMapVisualizer({
  farm,
  plots,
  cycles,
  onSelectPlot,
  onDispatchTaskForPlot,
}: FarmMapVisualizerProps) {
  const [activeLayer, setActiveLayer] = useState<'crops' | 'irrigation' | 'soil'>('crops');
  const [selectedPlotId, setSelectedPlotId] = useState<string>(plots[0]?.id || '');

  const selectedPlot = plots.find(p => p.id === selectedPlotId) || plots[0];
  const activeCycle = cycles.find(c => c.id === selectedPlot?.currentCropCycleId);

  // SVG Cadastral Coordinates for up to 6 plots layout
  const plotCoordinates = [
    { x: 30, y: 30, width: 220, height: 140, labelX: 140, labelY: 100 },
    { x: 270, y: 30, width: 200, height: 140, labelX: 370, labelY: 100 },
    { x: 490, y: 30, width: 240, height: 140, labelX: 610, labelY: 100 },
    { x: 30, y: 190, width: 280, height: 150, labelX: 170, labelY: 265 },
    { x: 330, y: 190, width: 210, height: 150, labelX: 435, labelY: 265 },
    { x: 560, y: 190, width: 170, height: 150, labelX: 645, labelY: 265 },
  ];

  const getPlotFill = (plot: LandPlot) => {
    if (activeLayer === 'crops') {
      const cycle = cycles.find(c => c.id === plot.currentCropCycleId);
      if (!cycle) return '#E2E8F0'; // Resting / fallow
      if (cycle.stage === 'Harvest Ready') return '#86EFAC';
      if (cycle.stage === 'Ripening' || cycle.stage === 'Fruiting / Grain Fill') return '#FDE047';
      return '#BBF7D0'; // Vegetative
    }

    if (activeLayer === 'irrigation') {
      if (plot.irrigationType.toLowerCase().includes('drip')) return '#BAE6FD';
      if (plot.irrigationType.toLowerCase().includes('sprinkler')) return '#7DD3FC';
      if (plot.irrigationType.toLowerCase().includes('canal')) return '#38BDF8';
      return '#E0F2FE';
    }

    // Soil Layer
    if (plot.soilType.toLowerCase().includes('podzolic')) return '#FED7AA'; // Orange/reddish brown
    if (plot.soilType.toLowerCase().includes('brown')) return '#FDE68A';
    if (plot.soilType.toLowerCase().includes('alluvial')) return '#D1D5DB';
    return '#E5E7EB';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Top Map Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF9F6]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Compass className="w-3.5 h-3.5 text-[#2D6A4F]" />
            <span className="font-semibold text-slate-800">{farm.name}</span>
            <span>·</span>
            <span>GPS: {farm.latitude.toFixed(4)}° N, {farm.longitude.toFixed(4)}° E</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5">
            Cadastral Field Layout & GIS Parcel Visualizer
          </h3>
        </div>

        {/* Layer Switches */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setActiveLayer('crops')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all ${
              activeLayer === 'crops'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sprout className="w-3.5 h-3.5 text-[#2D6A4F]" />
            <span>Crop Phenology</span>
          </button>

          <button
            onClick={() => setActiveLayer('irrigation')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all ${
              activeLayer === 'irrigation'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Droplet className="w-3.5 h-3.5 text-sky-600" />
            <span>Irrigation Flow</span>
          </button>

          <button
            onClick={() => setActiveLayer('soil')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all ${
              activeLayer === 'soil'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-700" />
            <span>Soil Order</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left 8 cols: Interactive SVG Cadastral Map */}
        <div className="lg:col-span-8 p-6 bg-[#F4F6F4] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200">
          <div className="relative aspect-16/10 w-full bg-[#E5ECE5] rounded-xl border border-slate-300 shadow-inner overflow-hidden flex items-center justify-center">
            <svg
              viewBox="0 0 760 380"
              className="w-full h-full select-none"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }}
            >
              {/* Farm Perimeter Background */}
              <rect x="15" y="15" width="730" height="350" rx="16" fill="#F0F4F0" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="6,4" />

              {/* Waterway / Canal feeder simulation */}
              <path
                d="M 15 180 Q 200 170 380 185 T 745 175"
                fill="none"
                stroke="#38BDF8"
                strokeWidth={activeLayer === 'irrigation' ? '8' : '4'}
                strokeOpacity="0.7"
              />

              {/* Render Plots */}
              {plots.map((plot, idx) => {
                const coords = plotCoordinates[idx] || {
                  x: 30 + (idx % 3) * 240,
                  y: 30 + Math.floor(idx / 3) * 160,
                  width: 210,
                  height: 130,
                  labelX: 135 + (idx % 3) * 240,
                  labelY: 95 + Math.floor(idx / 3) * 160,
                };

                const isSelected = selectedPlot?.id === plot.id;
                const cycle = cycles.find(c => c.id === plot.currentCropCycleId);

                return (
                  <g
                    key={plot.id}
                    onClick={() => {
                      setSelectedPlotId(plot.id);
                      if (onSelectPlot) onSelectPlot(plot);
                    }}
                    className="cursor-pointer transition-all duration-200 group"
                  >
                    <rect
                      x={coords.x}
                      y={coords.y}
                      width={coords.width}
                      height={coords.height}
                      rx="8"
                      fill={getPlotFill(plot)}
                      stroke={isSelected ? '#1B4332' : '#94A3B8'}
                      strokeWidth={isSelected ? '3.5' : '1.5'}
                      className="group-hover:opacity-95 transition-all"
                    />

                    {/* Plot Code Badge */}
                    <rect
                      x={coords.x + 10}
                      y={coords.y + 10}
                      width="68"
                      height="20"
                      rx="4"
                      fill="#FFFFFF"
                      fillOpacity="0.92"
                    />
                    <text
                      x={coords.x + 44}
                      y={coords.y + 24}
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill="#0F172A"
                    >
                      {plot.plotCode}
                    </text>

                    {/* Area Size */}
                    <text
                      x={coords.x + coords.width - 12}
                      y={coords.y + 24}
                      textAnchor="end"
                      fontSize="10"
                      fontFamily="monospace"
                      fill="#475569"
                    >
                      {plot.area} {plot.areaUnit}
                    </text>

                    {/* Plot Name */}
                    <text
                      x={coords.x + 12}
                      y={coords.y + 55}
                      fontSize="12"
                      fontWeight="600"
                      fill="#0F172A"
                    >
                      {plot.name}
                    </text>

                    {/* Crop or Status Label */}
                    <text
                      x={coords.x + 12}
                      y={coords.y + 75}
                      fontSize="11"
                      fill="#334155"
                    >
                      {cycle ? `${cycle.cropName} (${cycle.variety})` : 'Fallow / Uncultivated'}
                    </text>

                    {/* Stage indicator */}
                    {cycle && (
                      <text
                        x={coords.x + 12}
                        y={coords.y + 100}
                        fontSize="10"
                        fontWeight="600"
                        fill="#15803D"
                      >
                        ● {cycle.stage}
                      </text>
                    )}

                    {/* Active Irrigation overlay lines */}
                    {activeLayer === 'irrigation' && (
                      <line
                        x1={coords.x + 10}
                        y1={coords.y + coords.height - 15}
                        x2={coords.x + coords.width - 10}
                        y2={coords.y + coords.height - 15}
                        stroke="#0284C7"
                        strokeWidth="3"
                        strokeDasharray="4,2"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Map Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-slate-700">Legend:</span>
              {activeLayer === 'crops' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#BBF7D0] border border-slate-300" />
                    <span>Vegetative Growth</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#FDE047] border border-slate-300" />
                    <span>Ripening / Grain Fill</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#86EFAC] border border-slate-300" />
                    <span>Harvest Ready</span>
                  </span>
                </>
              )}
              {activeLayer === 'irrigation' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#BAE6FD]" />
                    <span>Drip Fertigation</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#38BDF8]" />
                    <span>Canal Sluice / Flood</span>
                  </span>
                </>
              )}
              {activeLayer === 'soil' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#FED7AA]" />
                    <span>Red-Yellow Podzolic</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#D1D5DB]" />
                    <span>Alluvial Loam</span>
                  </span>
                </>
              )}
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Click any cadastral plot to inspect telemetry
            </span>
          </div>
        </div>

        {/* Right 4 cols: Selected Plot Telemetry Inspector */}
        <div className="lg:col-span-4 p-5 space-y-5 bg-white flex flex-col justify-between">
          {selectedPlot ? (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedPlot.plotCode}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-slate-700">
                    {selectedPlot.area} {selectedPlot.areaUnit}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  {selectedPlot.name}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigned Estate: {farm.name}
                </p>
              </div>

              {/* Crop Phenology Status */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                <span className="font-semibold text-slate-700 block">
                  Current Cultivation Phenology
                </span>
                {activeCycle ? (
                  <div>
                    <p className="font-bold text-[#1B4332] text-sm">{activeCycle.cropName}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Variety: {activeCycle.variety} · Season: {activeCycle.season}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Stage: <strong className="text-slate-800">{activeCycle.stage}</strong></span>
                      <span className="font-mono tabular-nums">Target: {activeCycle.targetYieldKg.toLocaleString()} kg</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No active crop cycle. Land resting.</p>
                )}
              </div>

              {/* Agronomic Specifications */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>Soil Order:</span>
                  <strong className="text-slate-900">{selectedPlot.soilType}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>Irrigation Architecture:</span>
                  <strong className="text-slate-900">{selectedPlot.irrigationType}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>Cadastral Status:</span>
                  <span className="capitalize font-semibold text-emerald-800">{selectedPlot.status}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Select a plot on the map to inspect details.</p>
          )}

          {selectedPlot && onDispatchTaskForPlot && (
            <button
              onClick={() => onDispatchTaskForPlot(selectedPlot)}
              className="w-full py-2.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dispatch Task for {selectedPlot.plotCode}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
