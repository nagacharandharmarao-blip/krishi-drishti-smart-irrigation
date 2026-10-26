import React, { useState } from 'react';
import {
  Flame,
  CircleCheck,
  Cpu,
  Layers,
  Brain,
  Bell,
  TrendingUp
} from 'lucide-react';
import { TelemetryReading } from '../types';
import { GUNTUR_MIRCHI_STAGES } from '../utils/telemetryMath';

interface MirchiCaseStudyProps {
  currentReading: TelemetryReading;
}

export const MirchiCaseStudy: React.FC<MirchiCaseStudyProps> = ({ currentReading }) => {
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(2); // Default to flowering stage (Stage 3)
  const activeStage = GUNTUR_MIRCHI_STAGES[selectedStageIdx];

  return (
    <div className="space-y-6">
      {/* Hero Banner for Primary Crop */}
      <div className="bg-gradient-to-r from-red-950 via-rose-950 to-stone-900 text-white rounded-2xl p-6 shadow-md border border-rose-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-400" />
                PRIMARY CROP CASE-STUDY
              </span>
              <span className="text-xs text-stone-300">Guntur – Krishna Hot-Dry Agro-Climatic Zone</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Guntur Mirchi / Chilli (Capsicum annuum) Cultivation Lifecycle
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
              Stage-by-stage sensor orchestration, AI blossom-retention models, anthracnose dieback prevention, and precision drip-fertigation for high capsaicin &amp; oleoresin yield.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs px-4 py-3 rounded-xl border border-white/10 text-right">
            <span className="text-[11px] text-stone-300 block">Current Active Stage</span>
            <span className="text-base font-bold text-rose-300">{activeStage.stage}</span>
            <span className="text-xs text-stone-300 block font-mono">{activeStage.period}</span>
          </div>
        </div>
      </div>

      {/* Stage Selector Ribbon */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[750px] gap-2">
          {GUNTUR_MIRCHI_STAGES.map((s, idx) => {
            const isSelected = selectedStageIdx === idx;
            const isPast = idx < selectedStageIdx;
            return (
              <button
                key={s.stage}
                onClick={() => setSelectedStageIdx(idx)}
                className={`flex-1 text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-rose-600 bg-rose-50/80 ring-2 ring-rose-500/20'
                    : isPast
                      ? 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                      : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono text-[10px] text-stone-400">STAGE {idx + 1}</span>
                  {isPast ? (
                    <CircleCheck className="w-3.5 h-3.5 text-rose-600" />
                  ) : isSelected ? (
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  ) : null}
                </div>
                <div className={`text-xs font-bold ${isSelected ? 'text-rose-950' : 'text-stone-800'}`}>
                  {s.stage}
                </div>
                <div className="text-[11px] text-stone-500 font-mono mt-0.5">{s.period}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Architectural Monitored Parameters & Hardware/Software */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-stone-900">
                  {activeStage.stage} Overview ({activeStage.period})
                </h3>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 bg-stone-100 text-stone-700 rounded-md">
                Guntur S4 / Teja Chilli Protocol
              </span>
            </div>

            {/* 1. Parameters Monitored */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2">
                1. Parameters Monitored
              </span>
              <div className="flex flex-wrap gap-2">
                {activeStage.parametersMonitored.map(p => (
                  <span
                    key={p}
                    className="px-3 py-1 bg-rose-50 text-rose-900 border border-rose-200 rounded-lg text-xs font-medium"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* 2. Hardware & Software components */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 mb-2">
                  <Cpu className="w-4 h-4 text-amber-600" />
                  <span>Hardware Components</span>
                </div>
                <ul className="space-y-1.5 text-xs text-stone-600">
                  {activeStage.hardwareComponents.map(h => (
                    <li key={h} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 mb-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Software &amp; Telemetry Pipeline</span>
                </div>
                <ul className="space-y-1.5 text-xs text-stone-600">
                  {activeStage.softwareComponents.map(s => (
                    <li key={s} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI Module Card */}
            <div className="bg-gradient-to-r from-rose-50 to-amber-50 p-4 rounded-xl border border-rose-200">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-rose-700" />
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                  AI &amp; Precision Agronomy Module
                </span>
              </div>
              <p className="text-sm font-semibold text-rose-950">{activeStage.aiModule}</p>
            </div>

            {/* Actionable Advisory to Farmer */}
            <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Actionable Advisory to Chilli Grower
                </span>
              </div>
              <p className="text-sm font-medium text-amber-950">{activeStage.outputToFarmer}</p>
            </div>
          </div>
        </div>

        {/* Right Col: Live Telemetry vs Agronomic Thresholds */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
            <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              <span>Mirchi Stage Thresholds vs Live Telemetry</span>
            </h3>

            <div className="space-y-3 text-xs">
              {/* Soil Moisture */}
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <div className="flex justify-between items-center text-stone-500 mb-1">
                  <span>Soil Moisture Target</span>
                  <span className="font-mono text-stone-800">{activeStage.optimalRanges.soilMoisture}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-stone-700">Live Reading:</span>
                  <span className="text-emerald-700 font-mono text-sm">{currentReading.soilMoisture}%</span>
                </div>
              </div>

              {/* Soil pH */}
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <div className="flex justify-between items-center text-stone-500 mb-1">
                  <span>Soil pH Target</span>
                  <span className="font-mono text-stone-800">{activeStage.optimalRanges.soilPH}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-stone-700">Live Reading:</span>
                  <span className="text-purple-700 font-mono text-sm">{currentReading.soilPH} pH</span>
                </div>
              </div>

              {/* Electrical Conductivity (EC) */}
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <div className="flex justify-between items-center text-stone-500 mb-1">
                  <span>Electrical Conductivity (EC)</span>
                  <span className="font-mono text-stone-800">{activeStage.optimalRanges.soilEC}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-stone-700">Live Reading:</span>
                  <span className="text-amber-700 font-mono text-sm">{currentReading.soilEC} dS/m</span>
                </div>
              </div>

              {/* NPK Ratio */}
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <div className="flex justify-between items-center text-stone-500 mb-1">
                  <span>NPK Ratio Target</span>
                  <span className="font-mono text-stone-800">{activeStage.optimalRanges.npk}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-stone-700">Live Reading:</span>
                  <span className="text-emerald-700 font-mono text-sm">
                    N:{currentReading.npkN} P:{currentReading.npkP} K:{currentReading.npkK}
                  </span>
                </div>
              </div>

              {/* Ambient Temp */}
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <div className="flex justify-between items-center text-stone-500 mb-1">
                  <span>Ambient Canopy Temp</span>
                  <span className="font-mono text-stone-800">{activeStage.optimalRanges.temp}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-stone-700">Live SHT31:</span>
                  <span className="text-orange-700 font-mono text-sm">{currentReading.airTemp}°C</span>
                </div>
              </div>

              {/* Relative Humidity */}
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <div className="flex justify-between items-center text-stone-500 mb-1">
                  <span>Canopy Relative Humidity</span>
                  <span className="font-mono text-stone-800">{activeStage.optimalRanges.humidity}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-stone-700">Live SHT31:</span>
                  <span className="text-sky-700 font-mono text-sm">{currentReading.airHumidity}%</span>
                </div>
              </div>

              {/* Anthracnose Risk */}
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                <div className="flex justify-between items-center text-rose-900 mb-1">
                  <span className="font-semibold">Foliar Anthracnose Risk</span>
                  <span className="font-mono text-rose-800 font-bold">{currentReading.diseaseRiskStatus}</span>
                </div>
                <div className="text-[11px] text-rose-700 mt-1">
                  Leaf Wetness: {currentReading.leafWetness}% (Index: {currentReading.diseaseRiskScore}/100)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
