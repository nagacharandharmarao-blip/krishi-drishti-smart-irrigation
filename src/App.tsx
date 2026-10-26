import React, { useState, useEffect, useMemo } from 'react';
import { Bot, Sparkles, MessageSquare, X } from 'lucide-react';
import { TelemetryReading, ActuatorState } from './types';
import {
  generateInitialTelemetry,
  computeSensorMetrics,
  calculateVPD,
  calculateET0
} from './utils/telemetryMath';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { DashboardOverview } from './components/DashboardOverview';
import { StatisticalRepresentations } from './components/StatisticalRepresentations';
import { MirchiCaseStudy } from './components/MirchiCaseStudy';
import { TerraceGardenTrial } from './components/TerraceGardenTrial';
import { AiAssistant } from './components/AiAssistant';

export function App() {
  const [readings, setReadings] = useState<TelemetryReading[]>(() => generateInitialTelemetry());
  const [isLive, setIsLive] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>('soilMoisture');
  const [simulationNote, setSimulationNote] = useState<string>('');
  const [isFloatingAiOpen, setIsFloatingAiOpen] = useState<boolean>(false);

  const [actuators, setActuators] = useState<ActuatorState>({
    mainWaterPump: false,
    solenoidZoneA: true,
    solenoidZoneB: false,
    fertigationPump: false,
    buzzerAlarm: false,
    autoMode: true,
    lastChanged: new Date().toLocaleTimeString()
  });

  const currentReading = useMemo(
    () => readings[readings.length - 1] || readings[0],
    [readings]
  );

  const metrics = useMemo(
    () => computeSensorMetrics(readings),
    [readings]
  );

  // Simulated ESP32-C6 real-time 3-second telemetry tick
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setReadings(prev => {
        const last = prev[prev.length - 1];
        const now = new Date();

        let moisture = last.soilMoisture;
        let flowRate = last.waterFlowRate;
        let cumulativeFlow = last.cumulativeWaterFlow;
        let tankLevel = last.waterLevel;
        let ec = last.soilEC;
        let n = last.npkN;
        let p = last.npkP;
        let k = last.npkK;

        // Actuator dynamics
        if (actuators.mainWaterPump) {
          flowRate = Number((14.2 + (Math.random() * 1.2 - 0.6)).toFixed(1));
          cumulativeFlow += Number((flowRate / 20).toFixed(2));
          moisture = Number(Math.min(58, moisture + 0.35).toFixed(1));
          tankLevel = Math.max(10, tankLevel - 0.08);
        } else {
          flowRate = 0;
          if (!last.rainDetected) {
            moisture = Number(Math.max(28, moisture - 0.05).toFixed(1));
          }
        }

        if (actuators.fertigationPump) {
          ec = Number(Math.min(2.4, ec + 0.02).toFixed(2));
          n = Math.min(240, n + 1);
          k = Math.min(270, k + 1);
        }

        let leafWet = last.leafWetness;
        if (last.rainDetected) {
          leafWet = Math.min(95, leafWet + 2);
          moisture = Number(Math.min(60, moisture + 0.25).toFixed(1));
        } else {
          leafWet = Math.max(8, leafWet - 0.5);
        }

        const airTemp = Number((last.airTemp + (Math.random() * 0.4 - 0.2)).toFixed(1));
        const airHum = Number((last.airHumidity + (Math.random() * 0.6 - 0.3)).toFixed(1));
        const vpd = calculateVPD(airTemp, airHum);
        const et0 = calculateET0(airTemp, airHum, last.solarRadiation);
        const batt = Number((3.98 + (Math.random() * 0.04 - 0.02)).toFixed(2));
        const rssi = Math.round(-64 + (Math.random() * 4 - 2));

        // Closed-loop AI autonomous threshold controller
        if (actuators.autoMode) {
          if (moisture < 35 && !last.rainDetected && !actuators.mainWaterPump) {
            setActuators(a => ({
              ...a,
              mainWaterPump: true,
              solenoidZoneA: true,
              lastChanged: now.toLocaleTimeString()
            }));
            setSimulationNote(
              'AI Decision: Low soil moisture triggered automated precision drip cycle (Zone A)'
            );
          } else if (moisture >= 48 && actuators.mainWaterPump) {
            setActuators(a => ({
              ...a,
              mainWaterPump: false,
              lastChanged: now.toLocaleTimeString()
            }));
            setSimulationNote(
              'AI Decision: Soil moisture replenished to optimal 48%. Pump shut off to conserve water.'
            );
          }
        }

        const newReading: TelemetryReading = {
          id: `reading-live-${Date.now()}`,
          timestamp: now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          timeLabel: `${now.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          soilMoisture: moisture,
          airTemp,
          airHumidity: airHum,
          soilTemp: last.soilTemp,
          soilPH: last.soilPH,
          soilEC: ec,
          npkN: n,
          npkP: p,
          npkK: k,
          waterLevel: Number(tankLevel.toFixed(1)),
          waterTankVolume: Math.round((tankLevel / 100) * 1500),
          waterFlowRate: flowRate,
          cumulativeWaterFlow: Number(cumulativeFlow.toFixed(1)),
          rainDetected: last.rainDetected,
          rainRate: last.rainRate,
          leafWetness: Math.round(leafWet),
          waterTDS: last.waterTDS,
          esp32Battery: batt,
          esp32Rssi: rssi,
          esp32CpuTemp: last.esp32CpuTemp,
          solarChargingCurrent: last.solarChargingCurrent,
          solarRadiation: last.solarRadiation,
          vpd,
          et0,
          diseaseRiskScore: last.diseaseRiskScore,
          diseaseRiskStatus: last.diseaseRiskStatus
        };

        return [...prev.slice(1), newReading];
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive, actuators]);

  // Simulation handlers
  const handleSimulateRain = () => {
    setReadings(prev => {
      const copy = [...prev];
      const latest = { ...copy[copy.length - 1] };
      latest.rainDetected = true;
      latest.rainRate = 6.4;
      latest.leafWetness = 88;
      latest.airHumidity = 92;
      latest.soilMoisture = Number((latest.soilMoisture + 4.2).toFixed(1));
      latest.diseaseRiskScore = 78;
      latest.diseaseRiskStatus = 'Severe';
      copy[copy.length - 1] = latest;
      return copy;
    });

    if (actuators.autoMode) {
      setActuators(a => ({
        ...a,
        mainWaterPump: false,
        lastChanged: new Date().toLocaleTimeString()
      }));
    }
    setSimulationNote(
      'Heavy rain detected (6.4 mm/h). High leaf wetness (88%). AI automated irrigation lock initiated to prevent waterlogging & root rot.'
    );
  };

  const handleSimulateHeatwave = () => {
    setReadings(prev => {
      const copy = [...prev];
      const latest = { ...copy[copy.length - 1] };
      latest.airTemp = 36.8;
      latest.airHumidity = 42;
      latest.vpd = calculateVPD(36.8, 42);
      latest.soilMoisture = 33.2;
      latest.rainDetected = false;
      latest.rainRate = 0;
      copy[copy.length - 1] = latest;
      return copy;
    });
    setSimulationNote(
      'High VPD atmospheric drying event (36.8°C, 42% RH). Soil moisture dropped to 33.2%. AI automated pulse cooling irrigation triggered.'
    );
  };

  const handleSimulateFertigationPulse = () => {
    setReadings(prev => {
      const copy = [...prev];
      const latest = { ...copy[copy.length - 1] };
      latest.soilEC = 1.85;
      latest.npkN = 215;
      latest.npkP = 52;
      latest.npkK = 245;
      copy[copy.length - 1] = latest;
      return copy;
    });
    setActuators(a => ({
      ...a,
      fertigationPump: true,
      solenoidZoneA: true,
      lastChanged: new Date().toLocaleTimeString()
    }));
    setSimulationNote(
      'Precision Fertigation Pulse: Solenoid Zone A opened with balanced 1:100 NPK nutrient injection. Soil EC optimized to 1.85 dS/m.'
    );
  };

  const handleResetSimulation = () => {
    setReadings(generateInitialTelemetry());
    setActuators({
      mainWaterPump: false,
      solenoidZoneA: true,
      solenoidZoneB: false,
      fertigationPump: false,
      buzzerAlarm: false,
      autoMode: true,
      lastChanged: new Date().toLocaleTimeString()
    });
    setSimulationNote('Telemetry and actuators reset to baseline diurnal trajectory.');
  };

  const handleTogglePump = () => {
    setActuators(a => ({
      ...a,
      mainWaterPump: !a.mainWaterPump,
      lastChanged: new Date().toLocaleTimeString()
    }));
  };

  const handleToggleZoneA = () => {
    setActuators(a => ({
      ...a,
      solenoidZoneA: !a.solenoidZoneA,
      lastChanged: new Date().toLocaleTimeString()
    }));
  };

  const handleToggleZoneB = () => {
    setActuators(a => ({
      ...a,
      solenoidZoneB: !a.solenoidZoneB,
      lastChanged: new Date().toLocaleTimeString()
    }));
  };

  const handleToggleFertigation = () => {
    setActuators(a => ({
      ...a,
      fertigationPump: !a.fertigationPump,
      lastChanged: new Date().toLocaleTimeString()
    }));
  };

  const handleToggleAutoMode = () => {
    setActuators(a => ({
      ...a,
      autoMode: !a.autoMode,
      lastChanged: new Date().toLocaleTimeString()
    }));
  };

  const handleSelectMetricForDeepDive = (key: string) => {
    setSelectedMetricKey(key);
    setActiveTab('statistics');
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans text-stone-900">
      {/* Platform Header */}
      <Header
        currentReading={currentReading}
        actuators={actuators}
        isLive={isLive}
        onToggleLive={() => setIsLive(!isLive)}
        activeTab={activeTab}
        onSelectTab={tabId => setActiveTab(tabId)}
      />

      {/* Field Simulation & Relay Control Panel */}
      <ControlPanel
        actuators={actuators}
        onTogglePump={handleTogglePump}
        onToggleZoneA={handleToggleZoneA}
        onToggleZoneB={handleToggleZoneB}
        onToggleFertigation={handleToggleFertigation}
        onToggleAutoMode={handleToggleAutoMode}
        onSimulateRain={handleSimulateRain}
        onSimulateHeatwave={handleSimulateHeatwave}
        onSimulateFertigationPulse={handleSimulateFertigationPulse}
        onResetSimulation={handleResetSimulation}
        simulationNote={simulationNote}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            currentReading={currentReading}
            readings={readings}
            metrics={metrics}
            actuators={actuators}
            onSelectMetricForDeepDive={handleSelectMetricForDeepDive}
            onOpenAiAssistant={() => setActiveTab('assistant')}
          />
        )}

        {activeTab === 'statistics' && (
          <StatisticalRepresentations
            readings={readings}
            metrics={metrics}
            selectedMetricKey={selectedMetricKey}
            onSelectMetric={setSelectedMetricKey}
          />
        )}

        {activeTab === 'mirchi' && <MirchiCaseStudy currentReading={currentReading} />}

        {activeTab === 'terrace' && <TerraceGardenTrial />}

        {activeTab === 'assistant' && (
          <AiAssistant
            currentReading={currentReading}
            actuators={actuators}
            onTogglePump={handleTogglePump}
            onToggleZoneA={handleToggleZoneA}
            onToggleFertigation={handleToggleFertigation}
            onSimulateRain={handleSimulateRain}
            onSimulateHeatwave={handleSimulateHeatwave}
          />
        )}
      </main>

      {/* Floating AI Assistant Drawer/Modal (Available on all tabs) */}
      {isFloatingAiOpen && activeTab !== 'assistant' && (
        <div className="fixed bottom-20 right-4 z-50 w-full max-w-lg shadow-2xl rounded-2xl animate-fadeIn">
          <AiAssistant
            currentReading={currentReading}
            actuators={actuators}
            onTogglePump={handleTogglePump}
            onToggleZoneA={handleToggleZoneA}
            onToggleFertigation={handleToggleFertigation}
            onSimulateRain={handleSimulateRain}
            onSimulateHeatwave={handleSimulateHeatwave}
            isFloating={true}
            onCloseFloating={() => setIsFloatingAiOpen(false)}
          />
        </div>
      )}

      {/* Floating AI Assistant Quick Trigger Button */}
      {activeTab !== 'assistant' && (
        <button
          id="floating-ai-assistant-toggle"
          onClick={() => setIsFloatingAiOpen(prev => !prev)}
          className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full font-medium text-xs sm:text-sm text-white shadow-xl transition-all active:scale-95 ${
            isFloatingAiOpen
              ? 'bg-stone-800 hover:bg-stone-700 ring-2 ring-stone-500'
              : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 ring-2 ring-emerald-400/40 animate-pulse'
          }`}
          title="Open AI Agronomist Consultation"
        >
          {isFloatingAiOpen ? (
            <>
              <X className="w-5 h-5" />
              <span>Close AI Agronomist</span>
            </>
          ) : (
            <>
              <Bot className="w-5 h-5 text-emerald-100" />
              <span>Ask AI Agronomist</span>
              <span className="w-2 h-2 rounded-full bg-emerald-200 animate-ping" />
            </>
          )}
        </button>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-6 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-800">KRISHI-DRISHTI</span>
            <span>— AI-Driven Smart Irrigation &amp; Fertigation Platform</span>
          </div>
          <div className="flex items-center gap-4 text-stone-400 font-mono text-[11px]">
            <span>Sensors: SHT31, YF-S201, pH, EC, NPK, TDS</span>
            <span>Gateway: ESP32-C6 RISC-V</span>
            <span>Primary Crop: Guntur Mirchi (Capsicum annuum)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
