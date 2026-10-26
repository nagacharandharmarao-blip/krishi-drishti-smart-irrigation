import React from 'react';
import {
  Activity,
  ChartColumn,
  Flame,
  Layers,
  Cpu,
  Wifi,
  SunMedium,
  Pause,
  Play,
  Sprout,
  Droplets,
  SlidersVertical,
  Bot,
  Sparkles,
  Download
} from 'lucide-react';
import { TelemetryReading, ActuatorState } from '../types';

interface HeaderProps {
  currentReading: TelemetryReading;
  actuators: ActuatorState;
  isLive: boolean;
  onToggleLive: () => void;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentReading,
  actuators,
  isLive,
  onToggleLive,
  activeTab,
  onSelectTab
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Live Telemetry & Overview', icon: Activity },
    { id: 'statistics', label: 'Statistical Representations', icon: ChartColumn },
    { id: 'mirchi', label: 'Guntur Mirchi Case Study', icon: Flame },
    { id: 'terrace', label: 'Automated vs Manual Trial', icon: Layers },
    { id: 'assistant', label: 'AI Agronomist Assistant', icon: Bot, isSpecial: true }
  ];

  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-md">
      {/* Top Telemetry & Edge Gateway Status Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-stone-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>KRISHNA – GUNTUR AGRICULTURAL BELT</span>
          </div>
          <span className="text-stone-600 hidden sm:inline">|</span>
          <div className="text-stone-400 hidden md:flex items-center gap-1">
            <span>Primary Crop:</span>
            <span className="text-stone-200 font-medium">Guntur Mirchi / Chilli (Capsicum annuum)</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-stone-300">
          <div className="flex items-center gap-1.5 bg-stone-800/90 px-2.5 py-1 rounded-md border border-stone-700/60 font-mono text-[11px]">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>ESP32-C6 RISC-V</span>
            <span className="text-emerald-400 font-semibold">ONLINE</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-stone-400 font-mono text-[11px]">
            <Wifi className="w-3.5 h-3.5 text-sky-400" />
            <span>WiFi 6: {currentReading.esp32Rssi} dBm</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 text-stone-400 font-mono text-[11px]">
            <SunMedium className="w-3.5 h-3.5 text-amber-300" />
            <span>Batt: {currentReading.esp32Battery}V ({currentReading.solarChargingCurrent}mA solar)</span>
          </div>
          <button
            id="toggle-live-telemetry-btn"
            onClick={onToggleLive}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              isLive
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-stone-800 text-stone-400 border border-stone-700 hover:text-stone-200'
            }`}
            title="Toggle simulated ESP32 real-time 3-second telemetry tick"
          >
            {isLive ? (
              <>
                <Pause className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Live Stream: ON</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Stream: Paused</span>
              </>
            )}
          </button>

          <button
            id="header-open-ai-assistant-btn"
            onClick={() => onSelectTab('assistant')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all shadow-xs ${
              activeTab === 'assistant'
                ? 'bg-emerald-500 text-stone-950 font-bold'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500'
            }`}
            title="Open AI Agronomist Assistant"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
          </button>

          <a
            id="download-project-source-btn"
            href="/api/download-zip"
            download="krishi-drishti-project.zip"
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700/80 hover:text-white transition-all shadow-xs"
            title="Download full project source code as a ZIP file"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Download Code</span>
            <span className="sm:hidden">ZIP</span>
          </a>
        </div>
      </div>

      {/* Main Branding and Live Actuators Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-sans">KRISHI-DRISHTI</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                AI Smart Agriculture
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Precision Irrigation &amp; Fertigation Platform with ESP32-C6 Telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium ${
              actuators.mainWaterPump
                ? 'bg-blue-950/70 border-blue-500/50 text-blue-300'
                : 'bg-stone-800/60 border-stone-700 text-stone-400'
            }`}
          >
            <Droplets
              className={`w-3.5 h-3.5 ${actuators.mainWaterPump ? 'text-blue-400 animate-bounce' : ''}`}
            />
            <span>Main Pump: {actuators.mainWaterPump ? 'RUNNING' : 'STANDBY'}</span>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium ${
              actuators.fertigationPump
                ? 'bg-purple-950/70 border-purple-500/50 text-purple-300'
                : 'bg-stone-800/60 border-stone-700 text-stone-400'
            }`}
          >
            <SlidersVertical className="w-3.5 h-3.5" />
            <span>Fertigation: {actuators.fertigationPump ? 'ACTIVE' : 'OFF'}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-stone-800 text-emerald-400 border-b-2 border-emerald-500 shadow-inner'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
                {tab.isSpecial && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Live
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
