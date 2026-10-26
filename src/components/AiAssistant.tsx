import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Zap,
  Droplet,
  Leaf,
  Bug,
  Sun,
  ShieldAlert,
  CheckCircle2,
  Cpu,
  Layers,
  Flame,
  ArrowRight,
  SlidersVertical,
  X
} from 'lucide-react';
import { TelemetryReading, ActuatorState } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: string;
  suggestedAction?: 'TURN_ON_PUMP' | 'TURN_OFF_PUMP' | 'START_FERTIGATION' | 'NONE';
}

interface AiAssistantProps {
  currentReading: TelemetryReading;
  actuators: ActuatorState;
  onTogglePump?: () => void;
  onToggleZoneA?: () => void;
  onToggleFertigation?: () => void;
  onSimulateRain?: () => void;
  onSimulateHeatwave?: () => void;
  isFloating?: boolean;
  onCloseFloating?: () => void;
}

const PRESET_PROMPTS = [
  {
    category: 'Irrigation',
    icon: Droplet,
    text: 'Should I irrigate right now based on current soil moisture and VPD?',
    color: 'text-blue-500 bg-blue-50 border-blue-200 hover:bg-blue-100'
  },
  {
    category: 'Fertigation',
    icon: SlidersVertical,
    text: 'Evaluate my current N:P:K balance and recommend water-soluble fertilizer split.',
    color: 'text-purple-500 bg-purple-50 border-purple-200 hover:bg-purple-100'
  },
  {
    category: 'Disease Risk',
    icon: Bug,
    text: 'Analyze Anthracnose fungal risk with current leaf wetness and prescribe treatment.',
    color: 'text-rose-500 bg-rose-50 border-rose-200 hover:bg-rose-100'
  },
  {
    category: 'Heat & VPD',
    icon: Sun,
    text: 'Atmospheric VPD is high; how can I protect flower buds from dropping?',
    color: 'text-amber-500 bg-amber-50 border-amber-200 hover:bg-amber-100'
  },
  {
    category: 'Soil Health',
    icon: Leaf,
    text: 'How should I manage black cotton soil crack formation and salinity?',
    color: 'text-emerald-500 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
  }
];

export const AiAssistant: React.FC<AiAssistantProps> = ({
  currentReading,
  actuators,
  onTogglePump,
  onToggleZoneA,
  onToggleFertigation,
  onSimulateRain,
  onSimulateHeatwave,
  isFloating = false,
  onCloseFloating
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `**Namaskaram! I am your Krishi-Drishti AI Agronomist Assistant.**\n\nI am continuously monitoring real-time telemetry from your **ESP32-C6 gateway** in the Krishna-Guntur agricultural belt. Grounded in research standards from **ANGRAU Lam Agricultural Research Station**, I can provide actionable guidance on:\n\n• **Precision Drip Schedules**: Automated moisture replenishment and VPD balancing.\n• **Targeted Fertigation**: Stage-wise N:P:K dosing and soil EC regulation.\n• **Fungal & Pest Forecasting**: Leaf wetness-based Anthracnose and Powdery Mildew mitigation.\n• **Microclimate Defense**: Mitigating heatwaves, high VPD, and heavy rainfall drainage.\n\n*How can I assist your crop management today?*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'Krishi-Drishti Agronomic Engine'
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('Guntur Sannam Chilli (Capsicum annuum)');
  const [selectedSoil, setSelectedSoil] = useState('Krishna Black Cotton Vertisol');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [actionAppliedNotice, setActionAppliedNotice] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          crop: selectedCrop,
          soil: selectedSoil,
          telemetry: currentReading,
          history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'Agronomic assessment completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source || 'gemini-ai',
        suggestedAction: data.suggestedAction || 'NONE'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.warn('Chat request failed, generating regional agronomic fallback:', err);
      const fallbackMessage: ChatMessage = {
        id: `ai-fallback-${Date.now()}`,
        role: 'assistant',
        content: `**[ANGRAU Regional Agronomy Lam Farm - Krishna-Guntur]**\n\nRegarding **${selectedCrop}** in **${selectedSoil}**:\n\n• **Live Soil Moisture:** ${currentReading.soilMoisture}% (Ideal: 40-52%)\n• **Canopy Temperature / RH:** ${currentReading.airTemp}°C / ${currentReading.airHumidity}%\n• **Leaf Wetness:** ${currentReading.leafWetness}%\n\n**Actionable Advice:** Keep irrigation regulated to prevent water stagnation in vertisols. If moisture drops below 38%, initiate a 30-minute drip pulse. For pod-filling, apply foliar potassium nitrate (13:0:45) @ 4 g/L.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'angrau-regional-engine',
        suggestedAction: currentReading.soilMoisture < 38 ? 'TURN_ON_PUMP' : 'NONE'
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleSpeech = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text of markdown asterisks and hashtags for natural speech
    const cleanText = text
      .replace(/[*#_`]/g, '')
      .replace(/•/g, '')
      .replace(/\[.*?\]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleExecuteAction = (action?: string) => {
    if (!action) return;

    if (action === 'TURN_ON_PUMP') {
      if (!actuators.mainWaterPump && onTogglePump) {
        onTogglePump();
      }
      if (!actuators.solenoidZoneA && onToggleZoneA) {
        onToggleZoneA();
      }
      setActionAppliedNotice('Action Applied: Main Pump & Zone A Drip Activated');
    } else if (action === 'TURN_OFF_PUMP') {
      if (actuators.mainWaterPump && onTogglePump) {
        onTogglePump();
      }
      setActionAppliedNotice('Action Applied: Main Pump Interlock Engaged (Standby)');
    } else if (action === 'START_FERTIGATION') {
      if (!actuators.fertigationPump && onToggleFertigation) {
        onToggleFertigation();
      }
      setActionAppliedNotice('Action Applied: Precision Fertigation Pulse Initiated');
    }

    setTimeout(() => setActionAppliedNotice(null), 4000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Chat history cleared. Grounded in live ESP32-C6 telemetry (${currentReading.soilMoisture}% moisture, ${currentReading.airTemp}°C temp, ${currentReading.airHumidity}% humidity). What would you like to investigate?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'Krishi-Drishti Agronomic Engine'
      }
    ]);
  };

  return (
    <div
      className={`flex flex-col bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden ${
        isFloating ? 'h-[620px] max-h-[85vh] w-full' : 'min-h-[720px]'
      }`}
    >
      {/* Top Assistant Header & Live Telemetry Context */}
      <div className="bg-stone-900 text-stone-100 p-4 border-b border-stone-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-900/40">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-sans">
                  Krishi-Drishti AI Agronomist
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Grounded in Live Sensors
                </span>
              </div>
              <p className="text-xs text-stone-400">
                ANGRAU Lam Farm Agronomic Knowledge Base &bull; Neural Crop Doctor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 text-xs flex items-center gap-1 transition-colors"
              title="Reset conversation history"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            {isFloating && onCloseFloating && (
              <button
                onClick={onCloseFloating}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                title="Close floating assistant"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live Grounding Sensor Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-2 border-t border-stone-800/80 text-[11px] font-mono">
          <div className="bg-stone-800/80 px-2 py-1 rounded border border-stone-700/60 flex items-center justify-between">
            <span className="text-stone-400">Moisture:</span>
            <span
              className={`font-semibold ${
                currentReading.soilMoisture < 35
                  ? 'text-amber-400'
                  : currentReading.soilMoisture > 55
                  ? 'text-blue-400'
                  : 'text-emerald-400'
              }`}
            >
              {currentReading.soilMoisture}%
            </span>
          </div>
          <div className="bg-stone-800/80 px-2 py-1 rounded border border-stone-700/60 flex items-center justify-between">
            <span className="text-stone-400">Canopy:</span>
            <span className="font-semibold text-stone-200">
              {currentReading.airTemp}°C / {currentReading.airHumidity}%
            </span>
          </div>
          <div className="bg-stone-800/80 px-2 py-1 rounded border border-stone-700/60 flex items-center justify-between">
            <span className="text-stone-400">VPD:</span>
            <span
              className={`font-semibold ${
                currentReading.vpd > 1.8 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {currentReading.vpd} kPa
            </span>
          </div>
          <div className="bg-stone-800/80 px-2 py-1 rounded border border-stone-700/60 flex items-center justify-between">
            <span className="text-stone-400">Leaf Wet:</span>
            <span
              className={`font-semibold ${
                currentReading.leafWetness > 70 ? 'text-amber-400' : 'text-stone-300'
              }`}
            >
              {currentReading.leafWetness}%
            </span>
          </div>
          <div className="bg-stone-800/80 px-2 py-1 rounded border border-stone-700/60 flex items-center justify-between">
            <span className="text-stone-400">N:P:K:</span>
            <span className="font-semibold text-stone-200">
              {currentReading.npkN}:{currentReading.npkP}:{currentReading.npkK}
            </span>
          </div>
          <div className="bg-stone-800/80 px-2 py-1 rounded border border-stone-700/60 flex items-center justify-between">
            <span className="text-stone-400">Main Pump:</span>
            <span
              className={`font-semibold ${
                actuators.mainWaterPump ? 'text-blue-400 animate-pulse' : 'text-stone-400'
              }`}
            >
              {actuators.mainWaterPump ? 'RUNNING' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Crop & Soil Context Pickers */}
        <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400 font-medium">Crop:</span>
            <select
              value={selectedCrop}
              onChange={e => setSelectedCrop(e.target.value)}
              className="bg-stone-800 text-stone-200 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="Guntur Sannam Chilli (Capsicum annuum)">Guntur Sannam Chilli (Red Mirchi)</option>
              <option value="Byadagi Chilli (Capsicum annuum)">Byadagi Low-Pungency Chilli</option>
              <option value="Bell Pepper / Capsicum (Protected polyhouse)">Capsicum / Bell Pepper</option>
              <option value="Tomato (Solanum lycopersicum)">Tomato (Hybrid)</option>
              <option value="Cotton (Bt Cotton - Vertisol)">Bt Cotton (Guntur Region)</option>
              <option value="Terrace Kitchen Garden Container Crops">Terrace Container Garden</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-stone-400 font-medium">Soil Type:</span>
            <select
              value={selectedSoil}
              onChange={e => setSelectedSoil(e.target.value)}
              className="bg-stone-800 text-stone-200 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="Krishna Black Cotton Vertisol">Krishna Black Cotton Vertisol</option>
              <option value="Red Sandy Loam (Chalka soil)">Red Sandy Loam</option>
              <option value="Alluvial Delta Loam (Krishna river basin)">Alluvial Delta Loam</option>
              <option value="Cocopeat & Perlite Horticultural Substrate">Cocopeat Substrate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Applied Flash Banner */}
      {actionAppliedNotice && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionAppliedNotice}</span>
          </div>
          <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-mono">
            Actuator Synced
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-stone-50/50">
        {messages.map(msg => {
          const isAi = msg.role === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-stone-400">
                {isAi ? (
                  <>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5" />
                      AI Agronomist
                    </span>
                    {msg.source && (
                      <span className="bg-stone-200 text-stone-600 px-1.5 py-0.2 rounded text-[10px] font-mono">
                        {msg.source}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="font-semibold text-stone-600">You (Farmer)</span>
                )}
                <span>&bull;</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 shadow-xs text-sm leading-relaxed ${
                  isAi
                    ? 'bg-white text-stone-800 border border-stone-200 rounded-tl-sm'
                    : 'bg-emerald-700 text-white rounded-tr-sm'
                }`}
              >
                {/* Message Content with simple Markdown styling */}
                <div className="whitespace-pre-wrap font-sans text-[13px] sm:text-sm">
                  {msg.content.split('\n').map((line, i) => {
                    // Check for headers or bold lines
                    if (line.startsWith('### ')) {
                      return (
                        <h4 key={i} className="font-bold text-stone-900 mt-2 mb-1 text-sm">
                          {line.replace('### ', '')}
                        </h4>
                      );
                    }
                    if (line.startsWith('## ') || line.startsWith('# ')) {
                      return (
                        <h3 key={i} className="font-bold text-stone-900 mt-2 mb-1 text-sm border-b pb-1">
                          {line.replace(/^#+\s*/, '')}
                        </h3>
                      );
                    }
                    if (line.startsWith('• ') || line.startsWith('- ')) {
                      return (
                        <div key={i} className="flex items-start gap-1.5 my-1 pl-1">
                          <span className={isAi ? 'text-emerald-600 font-bold' : 'text-emerald-200'}>
                            &bull;
                          </span>
                          <span>{renderFormattedText(line.substring(2))}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={i} className={line.trim() === '' ? 'h-2' : 'my-1'}>
                        {renderFormattedText(line)}
                      </p>
                    );
                  })}
                </div>

                {/* Suggested Action Pill if AI detected one */}
                {isAi && msg.suggestedAction && msg.suggestedAction !== 'NONE' && (
                  <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-amber-800 font-medium">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Recommended Field Actuator Action:</span>
                    </div>
                    <button
                      onClick={() => handleExecuteAction(msg.suggestedAction)}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95"
                    >
                      <span>
                        {msg.suggestedAction === 'TURN_ON_PUMP'
                          ? '⚡ Turn On Main Pump & Drip'
                          : msg.suggestedAction === 'TURN_OFF_PUMP'
                          ? '🛑 Shut Down Pump (Rain Lock)'
                          : '🧪 Initiate Fertigation Pulse'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Utility Toolbar for AI responses */}
                {isAi && (
                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-end gap-2 text-stone-400">
                    <button
                      onClick={() => handleToggleSpeech(msg.id, msg.content)}
                      className={`p-1 rounded hover:text-stone-700 hover:bg-stone-100 transition-colors text-xs flex items-center gap-1 ${
                        speakingId === msg.id ? 'text-emerald-600 font-semibold' : ''
                      }`}
                      title={speakingId === msg.id ? 'Stop reading' : 'Read aloud'}
                    >
                      {speakingId === msg.id ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                          <span className="text-[11px] text-rose-600">Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Listen</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleCopyText(msg.id, msg.content)}
                      className="p-1 rounded hover:text-stone-700 hover:bg-stone-100 transition-colors text-xs flex items-center gap-1"
                      title="Copy response to clipboard"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[11px] text-emerald-600 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-stone-400">
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <Bot className="w-3.5 h-3.5 animate-spin" />
                AI Agronomist
              </span>
              <span>&bull;</span>
              <span>Analyzing live telemetry...</span>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm p-4 shadow-xs">
              <div className="flex items-center gap-3 text-stone-500 text-xs">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
                  <div
                    className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
                <span>Synthesizing ANGRAU agronomy standards with ESP32-C6 telemetry...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Preset Quick Prompt Suggestions */}
      <div className="px-4 py-2.5 bg-stone-100/70 border-t border-stone-200 overflow-x-auto scrollbar-none flex items-center gap-2 text-xs">
        <span className="text-stone-400 font-medium whitespace-nowrap text-[11px] uppercase tracking-wider">
          Suggested Queries:
        </span>
        {PRESET_PROMPTS.map((p, idx) => {
          const Icon = p.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSendMessage(p.text)}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all whitespace-nowrap shadow-2xs ${p.color}`}
            >
              <Icon className="w-3 h-3" />
              <span>{p.category}</span>
            </button>
          );
        })}
      </div>

      {/* Input Form Bar */}
      <div className="p-3 sm:p-4 bg-white border-t border-stone-200">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            id="ai-assistant-input"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            placeholder="Ask AI Agronomist (e.g., 'Should I irrigate right now?', 'Fertilizer dose for Mirchi flowering')..."
            disabled={isLoading}
            className="flex-1 bg-stone-50 border border-stone-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            id="ai-assistant-submit-btn"
            disabled={!inputQuery.trim() || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="flex items-center justify-between text-[11px] text-stone-400 mt-2 px-1">
          <span>Trained on Krishna-Guntur Agro-Ecological Zone &bull; ANGRAU Lam Farm Standards</span>
          <span className="hidden sm:inline">Telemetry Refreshed: {currentReading.timestamp}</span>
        </div>
      </div>
    </div>
  );
};

// Helper to render bold markdown (**text**)
function renderFormattedText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-stone-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
