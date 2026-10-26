import React, { useState } from 'react';
import {
  Calculator,
  TrendingUp,
  ChartNoAxesColumn,
  GitCommitHorizontal,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { TelemetryReading, SensorMetric } from '../types';
import {
  calculateHistogramBins,
  calculatePearsonCorrelation,
  CORRELATION_PAIRS
} from '../utils/telemetryMath';

interface StatisticalRepresentationsProps {
  readings: TelemetryReading[];
  metrics: SensorMetric[];
  selectedMetricKey: string;
  onSelectMetric: (key: string) => void;
}

export const StatisticalRepresentations: React.FC<StatisticalRepresentationsProps> = ({
  readings,
  metrics,
  selectedMetricKey,
  onSelectMetric
}) => {
  const [activeSubView, setActiveSubView] = useState<'timeseries' | 'histogram' | 'box' | 'correlation'>('timeseries');

  const currentMetric = metrics.find(m => m.key === selectedMetricKey) || metrics[0];
  const metricValues = readings.map(r => (typeof r[currentMetric.key] === 'number' ? (r[currentMetric.key] as number) : 0));

  const mean = currentMetric.mean;
  const stdDev = currentMetric.stdDev;
  const variance = currentMetric.variance;
  const coeffVar = mean !== 0 ? Number(((stdDev / mean) * 100).toFixed(1)) : 0;
  const iqr = Number((currentMetric.q75 - currentMetric.q25).toFixed(2));

  // Trajectory with confidence bounds data
  const timeSeriesData = readings.map(r => {
    const val = typeof r[currentMetric.key] === 'number' ? (r[currentMetric.key] as number) : 0;
    return {
      timestamp: r.timestamp,
      timeLabel: r.timeLabel,
      value: val,
      mean: mean,
      sigmaUpper: Number((mean + stdDev).toFixed(2)),
      sigmaLower: Number(Math.max(0, mean - stdDev).toFixed(2)),
      optimalMin: currentMetric.idealRange[0],
      optimalMax: currentMetric.idealRange[1]
    };
  });

  // Frequency histogram data
  const histogramBins = calculateHistogramBins(metricValues, 8);

  return (
    <div className="space-y-6">
      {/* Selector & Channel Header */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-stone-900">Statistical Representation Engine</h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Comprehensive statistical distribution, confidence ribbons (μ ± σ), frequency histograms, and Pearson correlation matrices for IoT sensors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-600 font-medium">Select Sensor Channel:</span>
            <select
              id="select-statistical-metric"
              value={selectedMetricKey}
              onChange={e => onSelectMetric(e.target.value)}
              className="bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {metrics.map(m => (
                <option key={m.key} value={m.key}>
                  {m.label} ({m.sensorModel}) — {m.unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick select pills */}
        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-stone-100">
          {metrics.slice(0, 8).map(m => (
            <button
              key={m.key}
              onClick={() => onSelectMetric(m.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                selectedMetricKey === m.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 8 Statistical Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-stone-400 block">Sample Size (N)</span>
          <span className="text-xl font-bold font-mono text-stone-900">{readings.length}</span>
          <span className="text-[10px] text-stone-500 block">Hourly intervals</span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-emerald-700 block">Mean (μ)</span>
          <span className="text-xl font-bold font-mono text-emerald-600">{mean}</span>
          <span className="text-[10px] text-stone-500 block">{currentMetric.unit} arithmetic avg</span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-stone-600 block">Median</span>
          <span className="text-xl font-bold font-mono text-stone-800">{currentMetric.median}</span>
          <span className="text-[10px] text-stone-500 block">50th percentile</span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-amber-700 block">Std Dev (σ)</span>
          <span className="text-xl font-bold font-mono text-amber-600">±{stdDev}</span>
          <span className="text-[10px] text-stone-500 block">Variance: {variance}</span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-stone-600 block">Coeff Var (CV)</span>
          <span className="text-xl font-bold font-mono text-stone-800">{coeffVar}%</span>
          <span className="text-[10px] text-stone-500 block">Dispersion index</span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-indigo-700 block">25% (Q1)</span>
          <span className="text-xl font-bold font-mono text-indigo-600">{currentMetric.q25}</span>
          <span className="text-[10px] text-stone-500 block">Lower quartile</span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-indigo-700 block">75% (Q3)</span>
          <span className="text-xl font-bold font-mono text-indigo-600">{currentMetric.q75}</span>
          <span className="text-[10px] text-stone-500 block">Upper (IQR: {iqr})</span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-stone-600 block">Min / Max</span>
          <span className="text-lg font-bold font-mono text-stone-900">
            {currentMetric.min} - {currentMetric.max}
          </span>
          <span className="text-[10px] text-stone-500 block">Spread range</span>
        </div>
      </div>

      {/* Sub-view switcher buttons */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubView('timeseries')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubView === 'timeseries'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Time-Series &amp; Confidence Band (μ ± σ)</span>
          </button>

          <button
            onClick={() => setActiveSubView('histogram')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubView === 'histogram'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <ChartNoAxesColumn className="w-3.5 h-3.5" />
            <span>Frequency Distribution Histogram</span>
          </button>

          <button
            onClick={() => setActiveSubView('box')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubView === 'box'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <GitCommitHorizontal className="w-3.5 h-3.5" />
            <span>Box-and-Whisker Breakdown</span>
          </button>

          <button
            onClick={() => setActiveSubView('correlation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubView === 'correlation'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sensor Correlation Matrix (Pearson r)</span>
          </button>
        </div>

        <span className="text-xs text-stone-500 hidden sm:inline font-mono">
          Model: {currentMetric.sensorModel}
        </span>
      </div>

      {/* View 1: Time-Series with μ ± σ Ribbon */}
      {activeSubView === 'timeseries' && (
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                24-Hour Telemetry Trajectory with Statistical Confidence Ribbon
              </h3>
              <p className="text-xs text-stone-500">
                Shows measured readings, sample mean (dashed green μ={mean}), and standard deviation bounds ([μ-σ, μ+σ] = [{Number((mean - stdDev).toFixed(1))}, {Number((mean + stdDev).toFixed(1))}]).
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-emerald-600 inline-block"></span>
                <span>Reading</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-500 inline-block"></span>
                <span>Mean (μ)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-emerald-100 border border-emerald-300 inline-block rounded-xs"></span>
                <span>±1σ Band</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-t-2 border-dotted border-amber-500 inline-block"></span>
                <span>Agronomic Target</span>
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={currentMetric.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={currentMetric.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis
                  domain={[
                    (dataMin: number) => Math.max(0, Number((dataMin * 0.85).toFixed(1))),
                    (dataMax: number) => Number((dataMax * 1.15).toFixed(1))
                  ]}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  unit={` ${currentMetric.unit}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-stone-900 text-stone-100 p-3 rounded-lg text-xs shadow-xl border border-stone-700">
                          <p className="font-semibold text-emerald-400 mb-1">{data.timeLabel}</p>
                          <div className="space-y-0.5 font-mono">
                            <p>
                              Value:{' '}
                              <span className="text-white font-bold">
                                {data.value} {currentMetric.unit}
                              </span>
                            </p>
                            <p className="text-stone-400">Mean: {data.mean}</p>
                            <p className="text-stone-400">±1σ: {data.sigmaLower} to {data.sigmaUpper}</p>
                            <p className="text-amber-400">
                              Ideal: {data.optimalMin} - {data.optimalMax} {currentMetric.unit}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={mean}
                  stroke="#059669"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Mean μ: ${mean}`,
                    position: 'insideTopLeft',
                    fill: '#059669',
                    fontSize: 11
                  }}
                />
                <ReferenceLine
                  y={currentMetric.idealRange[0]}
                  stroke="#d97706"
                  strokeDasharray="3 3"
                  label={{
                    value: `Min Target: ${currentMetric.idealRange[0]}`,
                    position: 'insideBottomLeft',
                    fill: '#d97706',
                    fontSize: 10
                  }}
                />
                <ReferenceLine
                  y={currentMetric.idealRange[1]}
                  stroke="#d97706"
                  strokeDasharray="3 3"
                  label={{
                    value: `Max Target: ${currentMetric.idealRange[1]}`,
                    position: 'insideTopRight',
                    fill: '#d97706',
                    fontSize: 10
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={currentMetric.color}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#metricGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* View 2: Frequency Distribution Histogram */}
      {activeSubView === 'histogram' && (
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Empirical Frequency Distribution Histogram
              </h3>
              <p className="text-xs text-stone-500">
                Frequency bins showing Gaussian clustering of {currentMetric.label} readings over recent 24-hour cycle.
              </p>
            </div>
            <span className="text-xs font-mono text-stone-600 bg-stone-100 px-2 py-1 rounded">
              Bin Width: {histogramBins.length ? ((currentMetric.max - currentMetric.min) / histogramBins.length).toFixed(2) : 0}{' '}
              {currentMetric.unit}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramBins} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis
                  dataKey="binLabel"
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  label={{
                    value: `Interval (${currentMetric.unit})`,
                    position: 'insideBottom',
                    offset: -10,
                    fontSize: 11
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  label={{
                    value: 'Sample Count (Frequency)',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 11
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as { binLabel: string; count: number };
                      const pct = ((data.count / readings.length) * 100).toFixed(1);
                      return (
                        <div className="bg-stone-900 text-stone-100 p-2.5 rounded-lg text-xs shadow-lg">
                          <p className="font-semibold text-emerald-400">
                            Range: {data.binLabel} {currentMetric.unit}
                          </p>
                          <p className="font-mono mt-1">
                            Occurrences: <span className="font-bold text-white">{data.count}</span> ({pct}% of cycle)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill={currentMetric.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* View 3: Box-and-Whisker Interquartile Dispersion */}
      {activeSubView === 'box' && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-stone-900">
              Box-and-Whisker Interquartile Dispersion Analysis
            </h3>
            <p className="text-xs text-stone-500">
              Visual breakdown of Min, First Quartile (Q1), Median (Q2), Third Quartile (Q3), Max, and Outlier Bounds (IQR = {iqr}).
            </p>
          </div>

          <div className="max-w-3xl mx-auto py-8">
            <div className="relative h-28 flex items-center">
              <div className="absolute left-8 right-8 h-1 bg-stone-300 rounded-full" />

              {/* Min Whisker */}
              <div className="absolute left-8 h-8 w-1 bg-stone-500 -ml-0.5 rounded" />
              <div className="absolute left-8 -top-4 text-xs font-mono font-semibold text-stone-600 -translate-x-1/2">
                Min: {currentMetric.min}
              </div>

              {/* Max Whisker */}
              <div className="absolute right-8 h-8 w-1 bg-stone-500 -mr-0.5 rounded" />
              <div className="absolute right-8 -top-4 text-xs font-mono font-semibold text-stone-600 translate-x-1/2">
                Max: {currentMetric.max}
              </div>

              {/* IQR Box */}
              <div
                className="absolute h-16 rounded-lg border-2 border-emerald-600 bg-emerald-100/60 shadow-xs flex items-center justify-center"
                style={{ left: '28%', right: '28%' }}
              >
                <div className="w-1 h-full bg-emerald-700 mx-auto relative">
                  <div className="absolute -top-7 text-xs font-mono font-bold text-emerald-800 -translate-x-1/2 whitespace-nowrap">
                    Median: {currentMetric.median}
                  </div>
                </div>
              </div>

              {/* Q1 & Q3 labels */}
              <div
                className="absolute text-xs font-mono text-stone-700 -bottom-6"
                style={{ left: '28%', transform: 'translateX(-50%)' }}
              >
                Q1 (25%): {currentMetric.q25}
              </div>
              <div
                className="absolute text-xs font-mono text-stone-700 -bottom-6"
                style={{ right: '28%', transform: 'translateX(50%)' }}
              >
                Q3 (75%): {currentMetric.q75}
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs border-t border-stone-200 pt-4">
              <div className="bg-stone-50 p-3 rounded-lg">
                <span className="font-semibold text-stone-900 block mb-1">Interquartile Range (IQR)</span>
                <span className="font-mono text-emerald-700 font-bold">
                  {iqr} {currentMetric.unit}
                </span>
                <p className="text-stone-500 text-[11px] mt-1">
                  Encompasses middle 50% of telemetry distribution.
                </p>
              </div>
              <div className="bg-stone-50 p-3 rounded-lg">
                <span className="font-semibold text-stone-900 block mb-1">Lower Outlier Threshold</span>
                <span className="font-mono text-amber-700 font-bold">
                  {Number((currentMetric.q25 - 1.5 * iqr).toFixed(2))} {currentMetric.unit}
                </span>
                <p className="text-stone-500 text-[11px] mt-1">
                  Calculated as Q1 - 1.5 * IQR.
                </p>
              </div>
              <div className="bg-stone-50 p-3 rounded-lg">
                <span className="font-semibold text-stone-900 block mb-1">Upper Outlier Threshold</span>
                <span className="font-mono text-amber-700 font-bold">
                  {Number((currentMetric.q75 + 1.5 * iqr).toFixed(2))} {currentMetric.unit}
                </span>
                <p className="text-stone-500 text-[11px] mt-1">
                  Calculated as Q3 + 1.5 * IQR.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 4: Multivariate Sensor Correlation Matrix (Pearson r) */}
      {activeSubView === 'correlation' && (
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Multivariate Sensor Correlation Matrix (Pearson Correlation r)
              </h3>
              <p className="text-xs text-stone-500">
                Measures linear dependency between physical channels (+1.0 perfect positive, -1.0 inverse).
              </p>
            </div>
            <span className="text-xs text-stone-500 font-mono">Sample Count N = {readings.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold">
                  <th className="py-2.5 px-3">Sensor Channel A</th>
                  <th className="py-2.5 px-3">Sensor Channel B</th>
                  <th className="py-2.5 px-3">Pearson r</th>
                  <th className="py-2.5 px-3">Correlation Type</th>
                  <th className="py-2.5 px-3">Agronomic Physical Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {CORRELATION_PAIRS.map((pair, idx) => {
                  const arrA = readings.map(r => (typeof r[pair.keyA] === 'number' ? (r[pair.keyA] as number) : 0));
                  const arrB = readings.map(r => (typeof r[pair.keyB] === 'number' ? (r[pair.keyB] as number) : 0));
                  const rVal = calculatePearsonCorrelation(arrA, arrB);

                  const isStrongPos = rVal >= 0.7;
                  const isModPos = rVal >= 0.3 && rVal < 0.7;
                  const isStrongInv = rVal <= -0.5;

                  return (
                    <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-stone-800">{pair.sensorA}</td>
                      <td className="py-2.5 px-3 font-medium text-stone-800">{pair.sensorB}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            isStrongPos
                              ? 'bg-emerald-100 text-emerald-800'
                              : isModPos
                                ? 'bg-blue-100 text-blue-800'
                                : isStrongInv
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {rVal > 0 ? `+${rVal}` : rVal}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {isStrongPos && <span className="text-emerald-700">Strong Positive</span>}
                        {isModPos && <span className="text-blue-700">Moderate Positive</span>}
                        {isStrongInv && <span className="text-rose-700">Strong Inverse</span>}
                        {!isStrongPos && !isModPos && !isStrongInv && (
                          <span className="text-stone-500">Weak / Neutral</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600 leading-relaxed">{pair.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
