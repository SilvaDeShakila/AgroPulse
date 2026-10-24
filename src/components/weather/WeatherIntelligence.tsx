import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  CloudRain,
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  RotateCw,
  Info,
  Calendar,
  Compass,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/apiClient';
import { WeatherData } from '../../types';
import { useToast } from '../common/Toast';

const SRI_LANKA_DISTRICTS = [
  'Nuwara Eliya',
  'Kandy',
  'Badulla',
  'Matale',
  'Anuradhapura',
  'Polonnaruwa',
  'Kurunegala',
  'Colombo',
  'Hambantota',
  'Galle',
  'Jaffna',
];

export function WeatherIntelligence() {
  const { showToast } = useToast();
  const [selectedDistrict, setSelectedDistrict] = useState('Nuwara Eliya');
  const [weather, setWeather] = useState<(WeatherData & { provider?: string; isLive?: boolean; providerStatus?: string; lastUpdated?: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async (district: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.weather.getDistrictWeather(district);
      if (res.data) {
        setWeather(res.data);
      } else {
        setError(res.error || 'Failed to retrieve meteorological data.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching weather.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(selectedDistrict);
  }, [selectedDistrict]);

  const handleRefresh = async () => {
    await fetchWeather(selectedDistrict);
    showToast('info', 'Radar Refreshed', `Retrieved meteorological observations for ${selectedDistrict}.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Module F: Microclimate Intelligence</span>
            <span>·</span>
            <span>Live Meteorological Provider</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-display">
            Agricultural Microclimate & Weather Intelligence
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            District-specific temperature, precipitation probability, relative humidity, and pathogen advisories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDistrict}
            onChange={e => setSelectedDistrict(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F]"
          >
            {SRI_LANKA_DISTRICTS.map(d => (
              <option key={d} value={d}>
                {d} Sector
              </option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            title="Refresh radar"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#2D6A4F]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Provider Status Indicator */}
      {weather && (
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${weather.isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-semibold text-slate-800">
              Provider: {weather.provider || 'Open-Meteo Global Atmospheric Grid'}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
              weather.isLive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {weather.isLive ? 'Live Atmospheric Radar' : 'Cached Baseline'}
            </span>
          </div>

          <div className="text-slate-500 text-[11px] font-mono">
            Observation Timestamp: {weather.lastUpdated ? new Date(weather.lastUpdated).toLocaleTimeString() : 'Current'}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Meteorological Feed Error</p>
            <p className="text-rose-800">{error}</p>
            <button
              onClick={() => fetchWeather(selectedDistrict)}
              className="mt-1 text-xs font-semibold text-[#1B4332] underline hover:opacity-80"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !weather && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
          <RotateCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Connecting to Meteorological Radar Feed...</p>
          <p className="text-xs text-slate-400">Retrieving atmospheric coordinates for {selectedDistrict} Sector</p>
        </div>
      )}

      {/* Main Meteorological Grid */}
      {weather && (
        <>
          {/* Current Observation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">Ambient Temperature</span>
                <Sun className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900 font-mono">
                {weather.temperature}&deg;C
              </p>
              <p className="text-[11px] text-slate-500">Live observation at station elevation</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">Relative Humidity</span>
                <Droplets className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900 font-mono">
                {weather.humidity}%
              </p>
              <p className="text-[11px] text-slate-500">Canopy boundary layer moisture</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">Precipitation Probability</span>
                <CloudRain className="w-4 h-4 text-teal-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900 font-mono">
                {weather.rainfallForecast}
              </p>
              <p className="text-[11px] text-slate-500">Numerical weather prediction model</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">Surface Wind Velocity</span>
                <Wind className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900 font-mono">
                {weather.windSpeed}
              </p>
              <p className="text-[11px] text-slate-500">10m anemometer velocity measurement</p>
            </div>
          </div>

          {/* Agronomic Risk & Advisories */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Agronomic Microclimate Advisories</span>
            </h3>

            <div className="space-y-2">
              {(weather.alerts || (weather.agriculturalAdvisory ? [weather.agriculturalAdvisory] : [])).map((alert, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                  <p className="leading-relaxed">{alert}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 5-Day Meteorological Forecast */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>5-Day Microclimate Forecast (Open-Meteo Model)</span>
              </h3>
              <span className="text-xs text-slate-400">Distinguished numerical prediction</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {(weather.forecast || weather.forecast5Days || []).map((f: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1.5"
                >
                  <p className="text-xs font-bold text-slate-900">{f.day}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{f.date}</p>
                  <div className="py-1">
                    <CloudSun className="w-6 h-6 text-emerald-700 mx-auto" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{f.condition}</p>
                  <div className="flex items-center justify-center gap-2 text-xs font-mono">
                    <span className="text-slate-900 font-bold">{f.tempHigh}&deg;</span>
                    <span className="text-slate-400">{f.tempLow}&deg;</span>
                  </div>
                  <div className="pt-1 text-[11px] text-blue-600 font-semibold flex items-center justify-center gap-1">
                    <Droplets className="w-3 h-3" />
                    <span>{f.rainProbability}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
