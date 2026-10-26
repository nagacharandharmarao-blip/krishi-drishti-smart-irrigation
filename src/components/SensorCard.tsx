import React from 'react';
import {
  Droplet,
  Thermometer,
  Wind,
  TestTube,
  Activity,
  Leaf,
  Waves,
  Gauge,
  CloudRain,
  ShieldAlert,
  Battery,
  Flame,
  Info,
  CircleCheck,
  CircleX,
  TriangleAlert
} from 'lucide-react';
import { SensorMetric } from '../types';

interface SensorCardProps {
  metric: SensorMetric;
  onSelectForDeepDive?: (metricKey: string) => void;
  isSelected?: boolean;
}

export const SensorCard: React.FC<SensorCardProps> = ({
  metric,
  onSelectForDeepDive,
  isSelected = false
}) => {
  const getIcon = (key: string) => {
    switch (key) {
      case 'soilMoisture':
        return Droplet;
      case 'airTemp':
      case 'soilTemp':
        return Thermometer;
      case 'airHumidity':
        return Wind;
      case 'soilPH':
        return TestTube;
      case 'soilEC':
        return Activity;
      case 'npkN':
      case 'npkP':
      case 'npkK':
        return Leaf;
      case 'waterLevel':
        return Waves;
      case 'waterFlowRate':
        return Gauge;
      case 'rainRate':
        return CloudRain;
      case 'leafWetness':
        return Leaf;
      case 'waterTDS':
        return ShieldAlert;
      case 'esp32Battery':
        return Battery;
      case 'vpd':
        return Flame;
      default:
        return Info;
    }
  };

  const Icon = getIcon(metric.key);

  // Range bar positioning
  const effectiveMin = Math.min(metric.idealRange[0] * 0.7, metric.min);
  const effectiveMax = Math.max(metric.idealRange[1] * 1.3, metric.max);
  const totalSpread = effectiveMax - effectiveMin || 1;

  const currentPercent = Math.min(100, Math.max(0, ((metric.current - effectiveMin) / totalSpread) * 100));
  const rangeStartPercent = Math.min(100, Math.max(0, ((metric.idealRange[0] - effectiveMin) / totalSpread) * 100));
  const rangeWidthPercent = Math.min(
    100 - rangeStartPercent,
    Math.max(5, ((metric.idealRange[1] - metric.idealRange[0]) / totalSpread) * 100)
  );

  return (
    <div
      id={`sensor-card-${metric.key}`}
      onClick={() => onSelectForDeepDive && onSelectForDeepDive(metric.key)}
      className={`relative bg-white rounded-xl p-4 border transition-all cursor-pointer shadow-xs hover:shadow-md ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
          : 'border-stone-200 hover:border-stone-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${metric.color}15`, color: metric.color }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-900 leading-tight">{metric.label}</h3>
            <span className="text-[11px] font-mono text-stone-500 block">{metric.sensorModel}</span>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
            metric.status === 'optimal'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : metric.status === 'warning'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {metric.status === 'optimal' ? (
            <CircleCheck className="w-3 h-3 text-emerald-600" />
          ) : metric.status === 'warning' ? (
            <TriangleAlert className="w-3 h-3 text-amber-600" />
          ) : (
            <CircleX className="w-3 h-3 text-rose-600" />
          )}
          {metric.status}
        </span>
      </div>

      <div className="flex items-baseline justify-between mt-3 mb-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-sans text-stone-900 tracking-tight">
            {metric.current}
          </span>
          <span className="text-xs font-semibold text-stone-500">{metric.unit}</span>
        </div>
        <div className="text-right text-[11px] font-mono text-stone-500">
          <span>Target: </span>
          <span className="font-semibold text-stone-700">
            {metric.idealRange[0]} - {metric.idealRange[1]} {metric.unit}
          </span>
        </div>
      </div>

      {/* Target range band and current point indicator */}
      <div className="relative w-full h-2 bg-stone-100 rounded-full overflow-hidden my-2.5">
        <div
          className="absolute top-0 bottom-0 bg-emerald-200/90 rounded-full"
          style={{ left: `${rangeStartPercent}%`, width: `${rangeWidthPercent}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-2.5 h-2.5 -mt-0.25 bg-stone-900 border-2 border-white rounded-full shadow-sm"
          style={{ left: `calc(${currentPercent}% - 5px)` }}
        />
      </div>

      {/* Statistical summary bar */}
      <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono pt-2 border-t border-stone-100">
        <span>μ: {metric.mean}</span>
        <span>σ: ±{metric.stdDev}</span>
        <span>Mdn: {metric.median}</span>
        <span>IQR: {Number((metric.q75 - metric.q25).toFixed(1))}</span>
      </div>
    </div>
  );
};
