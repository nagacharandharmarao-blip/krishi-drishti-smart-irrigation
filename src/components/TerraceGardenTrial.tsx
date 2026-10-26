import React from 'react';
import {
  Droplet,
  FlaskConical,
  Clock,
  CircleCheckBig,
  TriangleAlert,
  BarChart as BarChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { TERRACE_COMPARISON_DATA } from '../utils/telemetryMath';

export const TerraceGardenTrial: React.FC = () => {
  const trialMetrics = [
    {
      metric: 'Water Used (L/week)',
      Automated_ZoneA: 280,
      Manual_ZoneB: 425,
      unit: 'L',
      savings: '34.1% Saved'
    },
    {
      metric: 'Fertilizer (g/month)',
      Automated_ZoneA: 190,
      Manual_ZoneB: 265,
      unit: 'g',
      savings: '28.3% Saved'
    },
    {
      metric: 'Labor (hrs/week)',
      Automated_ZoneA: 1.4,
      Manual_ZoneB: 12.6,
      unit: 'hrs',
      savings: '88.9% Reduction'
    },
    {
      metric: 'Nutrient Leaching (%)',
      Automated_ZoneA: 3.5,
      Manual_ZoneB: 31,
      unit: '%',
      savings: '88.7% Less Loss'
    },
    {
      metric: 'Disease Foliage (%)',
      Automated_ZoneA: 2.1,
      Manual_ZoneB: 14.8,
      unit: '%',
      savings: '85.8% Healthier'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                Slide 8 Experimental Setup
              </span>
              <span className="text-xs text-stone-500 font-mono">
                12 ft x 12 ft Side-by-Side Plots (144 sq ft each)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
              Automated vs. Manual Terrace Garden Comparison
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
              Empirical validation comparing Zone A (ESP32-C6 AI Precision Drip &amp; Fertigation) against Zone B (Conventional Hand Watering &amp; Broadcast Fertilization).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Water Conserved</span>
              <span className="text-xl font-bold font-mono text-emerald-800">32.6%</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-blue-700 block">Labor Saved</span>
              <span className="text-xl font-bold font-mono text-blue-800">68.5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Zone Setup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Zone A Card */}
        <div className="bg-emerald-950/5 border-2 border-emerald-600/30 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block animate-pulse" />
              <h3 className="text-base font-bold text-emerald-950">ZONE A — AUTOMATED SYSTEM</h3>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
              AI Precision Drip
            </span>
          </div>
          <p className="text-xs text-emerald-900/80 mb-4">
            Autonomous closed-loop fertigation driven by ESP32-C6 RISC-V edge microcontroller, SHT31, YF-S201 flow meter, and soil probes.
          </p>

          <div className="space-y-2 text-xs font-medium text-emerald-950">
            <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-lg border border-emerald-200/60">
              <Droplet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Drip Irrigation with Solenoid Zone Valves</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-lg border border-emerald-200/60">
              <FlaskConical className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Inline Automated Venturi / Dosing Pump (Custom EC/TDS)</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-lg border border-emerald-200/60">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Triggered dynamically by soil moisture &amp; atmospheric VPD</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-lg border border-emerald-200/60">
              <CircleCheckBig className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Dry canopy: Leaf wetness strictly minimized to stop fungal spores</span>
            </div>
          </div>
        </div>

        {/* Zone B Card */}
        <div className="bg-stone-100 border-2 border-stone-300 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-stone-500 inline-block" />
              <h3 className="text-base font-bold text-stone-900">ZONE B — MANUAL CONTROL</h3>
            </div>
            <span className="text-xs font-mono font-semibold text-stone-700 bg-stone-200 px-2 py-0.5 rounded">
              Conventional Hand / Hose
            </span>
          </div>
          <p className="text-xs text-stone-600 mb-4">
            Standard conventional practice: hose watering and surface broadcast chemical fertilizer application without sensor feedback.
          </p>

          <div className="space-y-2 text-xs font-medium text-stone-800">
            <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-lg border border-stone-200">
              <Droplet className="w-4 h-4 text-stone-500 shrink-0" />
              <span>Hand hose / flood bucket watering</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-lg border border-stone-200">
              <FlaskConical className="w-4 h-4 text-stone-500 shrink-0" />
              <span>Manual broadcast solid fertilizer pellets every 2-3 weeks</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-lg border border-stone-200">
              <Clock className="w-4 h-4 text-stone-500 shrink-0" />
              <span>Fixed arbitrary time watering (susceptible to over/under irrigation)</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-lg border border-stone-200">
              <TriangleAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Wet foliage &amp; soil splashing: High anthracnose &amp; dieback spore germination</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparative Bar Chart */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <BarChartIcon className="w-4 h-4 text-emerald-600" />
              Resource Consumption &amp; Agronomic Efficiency Comparison
            </h3>
            <p className="text-xs text-stone-500">
              Quantitative resource audit between Zone A (Automated) vs. Zone B (Manual).
            </p>
          </div>
          <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-1 rounded">
            Controlled Testbed Data
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trialMetrics} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#78716c' }} />
              <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-stone-900 text-white p-3 rounded-lg text-xs font-mono shadow-xl border border-stone-700">
                        <p className="font-bold text-emerald-400 mb-1">{label}</p>
                        <p className="text-emerald-300">
                          Zone A (Automated):{' '}
                          <span className="font-bold">
                            {item.Automated_ZoneA} {item.unit}
                          </span>
                        </p>
                        <p className="text-stone-300">
                          Zone B (Manual):{' '}
                          <span className="font-bold">
                            {item.Manual_ZoneB} {item.unit}
                          </span>
                        </p>
                        <p className="text-amber-400 font-semibold mt-1">
                          Efficiency Gain: {item.savings}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar
                dataKey="Automated_ZoneA"
                name="Zone A: Automated Precision Drip"
                fill="#059669"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Manual_ZoneB"
                name="Zone B: Manual Flood / Hose"
                fill="#78716c"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
        <h3 className="text-sm font-bold text-stone-900 mb-3">
          Key Comparison Matrix (12 ft x 12 ft Experimental Testbed)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-700 font-semibold">
                <th className="py-3 px-4">Evaluation Parameter</th>
                <th className="py-3 px-4">Zone A — Automated Drip</th>
                <th className="py-3 px-4">Zone B — Manual</th>
                <th className="py-3 px-4">Target Improvement &amp; Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {TERRACE_COMPARISON_DATA.map((row, idx) => (
                <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-stone-900">{row.parameter}</td>
                  <td className="py-3 px-4 font-medium text-emerald-800">{row.zoneAAutomated}</td>
                  <td className="py-3 px-4 text-stone-600">{row.zoneBManual}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold border ${row.impactColor}`}>
                      {row.improvement}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
