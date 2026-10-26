import React from 'react';
import {
  Droplet,
  Thermometer,
  Gauge,
  Leaf,
  CircleCheckBig,
  Bot,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { TelemetryReading, SensorMetric, ActuatorState } from '../types';
import { SensorCard } from './SensorCard';

interface DashboardOverviewProps {
  currentReading: TelemetryReading;
  readings: TelemetryReading[];
  metrics: SensorMetric[];
  actuators: ActuatorState;
  onSelectMetricForDeepDive: (key: string) => void;
  onOpenAiAssistant?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentReading,
  readings,
  metrics,
  actuators,
  onSelectMetricForDeepDive,
  onOpenAiAssistant
}) => {
  const moistureFlowData = readings.map(r => ({
    timestamp: r.timestamp,
    moisture: r.soilMoisture,
    flow: r.waterFlowRate
  }));

  const climateVpdData = readings.map(r => ({
    timestamp: r.timestamp,
    temp: r.airTemp,
    humidity: r.airHumidity,
    vpd: r.vpd
  }));

  return (
    <div className="space-y-6">
      {/* AI Agronomist Live Advisory Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-emerald-950 text-white rounded-2xl p-4 sm:p-5 border border-emerald-500/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Live AI Agronomist Advisory
              </span>
              <span className="bg-emerald-500/10 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                ANGRAU Lam Standards
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-200 mt-1">
              {currentReading.soilMoisture < 38 ? (
                <span>
                  <strong className="text-amber-300">Irrigation Alert:</strong> Soil moisture is low ({currentReading.soilMoisture}%). Zone A precision drip cycle recommended to avert blossom-end rot.
                </span>
              ) : currentReading.rainDetected ? (
                <span>
                  <strong className="text-sky-300">Rain Interlock:</strong> Precipitation active ({currentReading.rainRate} mm/h). Irrigation halted to protect black cotton vertisol from root hypoxia.
                </span>
              ) : currentReading.leafWetness > 75 ? (
                <span>
                  <strong className="text-rose-300">Fungal Warning:</strong> Canopy leaf wetness is elevated ({currentReading.leafWetness}%). High sporulation risk for Anthracnose fruit rot.
                </span>
              ) : (
                <span>
                  <strong className="text-emerald-300">Optimal Canopy Equilibrium:</strong> Moisture ({currentReading.soilMoisture}%) and VPD ({currentReading.vpd} kPa) in ideal range for Guntur Mirchi pod formation.
                </span>
              )}
            </p>
          </div>
        </div>

        {onOpenAiAssistant && (
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all shrink-0 active:scale-95 whitespace-nowrap"
          >
            <span>Consult AI Assistant</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Soil Moisture Status */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Soil Moisture Status
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-sans text-stone-900">
                {currentReading.soilMoisture}%
              </span>
              <span className="text-xs font-medium text-stone-500">Volumetric</span>
            </div>
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1 mt-1">
              <CircleCheckBig className="w-3.5 h-3.5" />
              Optimal Root Rhizosphere
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Droplet className="w-6 h-6" />
          </div>
        </div>

        {/* Canopy Climate (SHT31) */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Canopy Climate (SHT31)
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-sans text-stone-900">
                {currentReading.airTemp}°C
              </span>
              <span className="text-xs text-stone-500 font-mono">
                / {currentReading.airHumidity}% RH
              </span>
            </div>
            <span className="text-xs text-stone-600 font-medium flex items-center gap-1 mt-1 font-mono">
              VPD: <strong className="text-amber-700">{currentReading.vpd} kPa</strong> (ET0: {currentReading.et0} mm/d)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Thermometer className="w-6 h-6" />
          </div>
        </div>

        {/* Reservoir & Flow (YF-S201) */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Reservoir &amp; Flow (YF-S201)
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-sans text-stone-900">
                {currentReading.waterLevel}%
              </span>
              <span className="text-xs text-stone-500">
                ({currentReading.waterTankVolume} L)
              </span>
            </div>
            <span className="text-xs text-stone-600 font-medium flex items-center gap-1 mt-1 font-mono">
              Flow: <strong className="text-blue-700">{currentReading.waterFlowRate} L/min</strong> ({currentReading.cumulativeWaterFlow} L total)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Gauge className="w-6 h-6" />
          </div>
        </div>

        {/* Foliar Disease Prediction */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Foliar Disease Prediction
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-xl font-bold font-sans ${
                  currentReading.diseaseRiskStatus === 'Low'
                    ? 'text-emerald-700'
                    : currentReading.diseaseRiskStatus === 'Moderate'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                }`}
              >
                {currentReading.diseaseRiskStatus} Risk
              </span>
            </div>
            <span className="text-xs text-stone-600 font-medium flex items-center gap-1 mt-1 font-mono">
              Leaf Wetness: <strong className="text-teal-700">{currentReading.leafWetness}%</strong> (Score: {currentReading.diseaseRiskScore})
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
            <Leaf className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Live Sensor Telemetry Array (11 Channels + ESP32 Gateway) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-stone-900">
              Live Sensor Telemetry Array (11 Channels + ESP32-C6 Gateway)
            </h2>
            <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
              All Channels Online
            </span>
          </div>
          <span className="text-xs text-stone-500 hidden sm:inline">
            Click any sensor card to inspect statistical distributions (μ, σ, histograms)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {metrics.map(metric => (
            <SensorCard
              key={metric.key}
              metric={metric}
              onSelectForDeepDive={onSelectMetricForDeepDive}
            />
          ))}
        </div>
      </div>

      {/* 24-Hour Telemetry Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Soil Moisture vs Irrigation Flow */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Soil Moisture vs. Irrigation Flow (YF-S201)
              </h3>
              <p className="text-xs text-stone-500">
                Illustrates rhizosphere moisture absorption following pulse drip delivery.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              24-Hour Window
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moistureFlowData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis yAxisId="left" domain={[30, 60]} tick={{ fontSize: 11, fill: '#059669' }} unit="%" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 25]}
                  tick={{ fontSize: 11, fill: '#2563eb' }}
                  unit=" L/m"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-stone-900 text-white p-2.5 rounded-lg text-xs font-mono shadow-md">
                          <p className="text-emerald-400 font-bold mb-1">{label}</p>
                          <p className="text-emerald-300">Soil Moisture: {payload[0]?.value}%</p>
                          <p className="text-blue-300">Flow Rate: {payload[1]?.value} L/min</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="moisture"
                  name="Soil Moisture (%)"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="flow"
                  name="Flow Rate (L/min)"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 2"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SHT31 Climate & VPD */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                SHT31 Ambient Climate &amp; Vapor Pressure Deficit (VPD)
              </h3>
              <p className="text-xs text-stone-500">
                Monitors atmospheric drying power and transpiration stress in Guntur Mirchi canopy.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              SHT31-D I2C
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={climateVpdData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis yAxisId="left" domain={[20, 40]} tick={{ fontSize: 11, fill: '#ea580c' }} unit="°C" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[30, 95]}
                  tick={{ fontSize: 11, fill: '#0284c7' }}
                  unit="%"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-stone-900 text-white p-2.5 rounded-lg text-xs font-mono shadow-md">
                          <p className="text-amber-400 font-bold mb-1">{label}</p>
                          <p className="text-amber-300">Temp: {payload[0]?.value}°C</p>
                          <p className="text-sky-300">Humidity: {payload[1]?.value}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temp"
                  name="Air Temp (°C)"
                  stroke="#ea580c"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  name="Humidity (%)"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
