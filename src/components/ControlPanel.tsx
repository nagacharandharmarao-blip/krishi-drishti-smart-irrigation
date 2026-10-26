import React from 'react';
import {
  Radio,
  CloudRain,
  Flame,
  FlaskConical,
  RotateCcw,
  Zap,
  ToggleRight,
  ToggleLeft,
  Power,
  TriangleAlert
} from 'lucide-react';
import { ActuatorState } from '../types';

interface ControlPanelProps {
  actuators: ActuatorState;
  onTogglePump: () => void;
  onToggleZoneA: () => void;
  onToggleZoneB: () => void;
  onToggleFertigation: () => void;
  onToggleAutoMode: () => void;
  onSimulateRain: () => void;
  onSimulateHeatwave: () => void;
  onSimulateFertigationPulse: () => void;
  onResetSimulation: () => void;
  simulationNote: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  actuators,
  onTogglePump,
  onToggleZoneA,
  onToggleZoneB,
  onToggleFertigation,
  onToggleAutoMode,
  onSimulateRain,
  onSimulateHeatwave,
  onSimulateFertigationPulse,
  onResetSimulation,
  simulationNote
}) => {
  return (
    <div className="bg-stone-100 border-b border-stone-200 py-3 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Simulation Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            Simulate Field Event:
          </span>

          <button
            id="sim-rain-btn"
            onClick={onSimulateRain}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100 transition-colors shadow-xs"
            title="Inject rain sensor event, high leaf wetness and auto irrigation lock"
          >
            <CloudRain className="w-3.5 h-3.5 text-sky-600" />
            <span>Precipitation Event</span>
          </button>

          <button
            id="sim-heat-btn"
            onClick={onSimulateHeatwave}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors shadow-xs"
            title="Inject midday heatwave with high VPD and dry soil moisture"
          >
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            <span>Heat &amp; Dry Stress</span>
          </button>

          <button
            id="sim-fert-btn"
            onClick={onSimulateFertigationPulse}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-900 border border-purple-300 hover:bg-purple-100 transition-colors shadow-xs"
            title="Inject precision fertigation dosing pulse with NPK &amp; EC surge"
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
            <span>Fertigation Pulse</span>
          </button>

          <button
            id="sim-reset-btn"
            onClick={onResetSimulation}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-stone-200 text-stone-700 hover:bg-stone-300 transition-colors"
            title="Reset telemetry to baseline diurnal curve"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Actuator Relays Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Actuator Relays:</span>
          </div>

          <button
            id="toggle-auto-mode-btn"
            onClick={onToggleAutoMode}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
              actuators.autoMode ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
            }`}
            title="Toggle between AI Autonomous control and Manual Farmer Override"
          >
            {actuators.autoMode ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-600" />
                <span>AI Auto</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-stone-500" />
                <span>Manual</span>
              </>
            )}
          </button>

          <button
            id="toggle-pump-btn"
            onClick={onTogglePump}
            disabled={actuators.autoMode}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
              actuators.mainWaterPump
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            } ${actuators.autoMode ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={actuators.autoMode ? 'Disable Auto Mode to override manually' : 'Toggle Main Pump'}
          >
            <Power className="w-3 h-3" />
            <span>Pump</span>
          </button>

          <button
            id="toggle-solenoid-a-btn"
            onClick={onToggleZoneA}
            disabled={actuators.autoMode}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              actuators.solenoidZoneA
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            } ${actuators.autoMode ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            Zone A
          </button>

          <button
            id="toggle-solenoid-b-btn"
            onClick={onToggleZoneB}
            disabled={actuators.autoMode}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              actuators.solenoidZoneB
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            } ${actuators.autoMode ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            Zone B
          </button>

          <button
            id="toggle-fertigation-btn"
            onClick={onToggleFertigation}
            disabled={actuators.autoMode}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              actuators.fertigationPump
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            } ${actuators.autoMode ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            Fert Dosing
          </button>
        </div>
      </div>

      {/* Active Simulation Feedback Banner */}
      {simulationNote && (
        <div className="max-w-7xl mx-auto mt-2 flex items-center gap-2 text-xs bg-amber-50 text-amber-900 border border-amber-200/80 px-3 py-1.5 rounded-lg">
          <TriangleAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="font-medium">Active Simulation Event:</span>
          <span>{simulationNote}</span>
        </div>
      )}
    </div>
  );
};
