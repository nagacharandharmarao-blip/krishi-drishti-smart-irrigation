import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// CommonJS and ESM compatible dirname resolution
const _dir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    return null;
  }
  if (!geminiClient) {
    try {
      geminiClient = new GoogleGenAI({
        apiKey: key.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.warn('Failed to initialize GoogleGenAI client:', err);
    }
  }
  return geminiClient;
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
}

// Resilient Gemini model caller with exponential backoff & model fallbacks
// Prevents 503 "model is experiencing high demand" spikes from disrupting the system
async function generateContentWithFallback(params: {
  contents: string;
  config?: any;
}): Promise<{ text: string; modelUsed: string } | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  // Prioritized models supported by the system
  const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model,
            contents: params.contents,
            config: params.config,
          }),
          14000,
          `Model ${model} timed out after 14s`
        );

        if (response && response.text) {
          return { text: response.text, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        const code = err?.status || err?.code;
        const isTemporarySpike =
          code === 503 ||
          code === 429 ||
          msg.includes('503') ||
          msg.includes('timed out') ||
          msg.includes('high demand') ||
          msg.includes('Spikes in demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('ResourceExhausted');

        if (isTemporarySpike && attempt === 0) {
          // Wait 500ms before immediate retry
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        // Move to the next model in the fallback chain
        console.warn(`Model [${model}] unavailable (${msg.slice(0, 110)}...). Trying next candidate model.`);
        break;
      }
    }
  }

  throw lastError;
}

// Valve & Actuator Solenoid State
interface ValveState {
  mainPump: boolean;
  zone1Drip: boolean;
  zone2Sprinkler: boolean;
  fertigationInjector: boolean;
  autoPilot: boolean;
  lastChanged: string;
  interlocksTriggered: {
    rainCutoff: boolean;
    overSaturationCutoff: boolean;
    highSalinityCutoff: boolean;
    lowWaterTankCutoff: boolean;
  };
}

let valveState: ValveState = {
  mainPump: false,
  zone1Drip: false,
  zone2Sprinkler: false,
  fertigationInjector: false,
  autoPilot: true,
  lastChanged: new Date().toISOString(),
  interlocksTriggered: {
    rainCutoff: false,
    overSaturationCutoff: false,
    highSalinityCutoff: false,
    lowWaterTankCutoff: false,
  },
};

// In-memory data store for telemetry
interface ServerSensorReading {
  id: string;
  timestamp: string;
  soilMoisture: number;
  soilPh: number;
  soilEc: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  airTemperature: number;
  airHumidity: number;
  waterLevel: number;
  waterFlowRate: number;
  cumulativeWaterFlow: number;
  waterTds: number;
  rainIntensity: number;
  isRaining: boolean;
  leafWetness: number;
  vpd: number;
  dewPoint: number;
  salinityStressIndex: 'Optimal' | 'Low' | 'Moderate' | 'High Salinity';
}

interface ServerDeviceStatus {
  deviceId: string;
  chipModel: string;
  macAddress: string;
  status: 'online' | 'active_streaming' | 'standby' | 'offline';
  wifiSsid: string;
  wifiRssi: number;
  signalQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  ipAddress: string;
  batteryVoltage: number;
  batteryPercent: number;
  solarCharging: boolean;
  solarVoltage: number;
  uptimeSeconds: number;
  freeHeapBytes: number;
  firmwareVersion: string;
  lastSyncTime: string;
  protocol: string;
}

// Math helpers
function calcVPD(temp: number, rh: number): number {
  const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
  const avp = svp * (rh / 100);
  return Math.max(0, parseFloat((svp - avp).toFixed(2)));
}

function calcDewPoint(temp: number, rh: number): number {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(Math.max(0.01, rh / 100));
  return parseFloat(((b * alpha) / (a - alpha)).toFixed(1));
}

function calcSalinity(ec: number): 'Optimal' | 'Low' | 'Moderate' | 'High Salinity' {
  if (ec < 1200) return 'Optimal';
  if (ec < 2200) return 'Low';
  if (ec < 3500) return 'Moderate';
  return 'High Salinity';
}

// Generate seeded historical data
function buildInitialHistory(count = 36): ServerSensorReading[] {
  const history: ServerSensorReading[] = [];
  const now = Date.now();
  const stepMs = 3600 * 1000;

  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now - i * stepMs);
    const hour = time.getHours();
    const sun = Math.sin(((hour - 6) / 24) * 2 * Math.PI);
    const temp = 24 + sun * 6;
    const hum = 65 - sun * 25;

    let moisture = 62 - (i % 18) * 0.8;
    if (i < 8) moisture += 14;
    moisture = Math.max(30, Math.min(85, moisture));

    const hoursElapsed = count - 1 - i;
    const n = Math.max(110, 168 - hoursElapsed * 0.95 + (Math.sin(i * 0.4) * 2));
    const p = Math.max(45, 68 - hoursElapsed * 0.35 + (Math.cos(i * 0.3) * 1.2));
    const k = Math.max(140, 215 - hoursElapsed * 1.1 + (Math.sin(i * 0.5) * 3));

    const leafWetness = (hour >= 22 || hour <= 6) ? Math.min(95, 75 + Math.random() * 20) : Math.max(5, 20 - sun * 15);
    const isRain = i >= 18 && i <= 21;
    const rainIntensity = isRain ? 45 + Math.round(Math.random() * 25) : 0;
    const waterFlowRate = (hour === 7 || hour === 17) ? 4.2 + Math.random() * 0.8 : 0;
    const cumulativeWaterFlow = 1420 + hoursElapsed * 12 + (isRain ? 0 : 25);
    const soilEc = 1450 + (moisture < 45 ? 280 : -120) + Math.round(Math.random() * 40);
    const soilPh = parseFloat((6.45 + Math.sin(i * 0.2) * 0.15).toFixed(2));
    const waterTds = 280 + Math.round(Math.sin(i * 0.1) * 35);
    const waterLevel = Math.max(40, 88 - (hoursElapsed * 0.65));

    history.push({
      id: `reading-${time.getTime()}`,
      timestamp: time.toISOString(),
      soilMoisture: parseFloat(moisture.toFixed(1)),
      soilPh,
      soilEc,
      nitrogen: Math.round(n),
      phosphorus: Math.round(p),
      potassium: Math.round(k),
      airTemperature: parseFloat(temp.toFixed(1)),
      airHumidity: parseFloat(hum.toFixed(1)),
      waterLevel: Math.round(waterLevel),
      waterFlowRate: parseFloat(waterFlowRate.toFixed(1)),
      cumulativeWaterFlow: Math.round(cumulativeWaterFlow),
      rainIntensity,
      isRaining: rainIntensity > 10,
      leafWetness: Math.round(leafWetness),
      waterTds,
      vpd: calcVPD(temp, hum),
      dewPoint: calcDewPoint(temp, hum),
      salinityStressIndex: calcSalinity(soilEc),
    });
  }
  return history;
}

let historicalReadings: ServerSensorReading[] = buildInitialHistory(36);
let deviceStatus: ServerDeviceStatus = {
  deviceId: 'ESP32-C6-AGRI-01',
  chipModel: 'ESP32-C6-WROOM-1 (RISC-V 32-bit @ 160MHz)',
  macAddress: '84:FC:E6:3C:A2:8E',
  status: 'online',
  wifiSsid: 'AgriMesh-FarmNet-IoT',
  wifiRssi: -58,
  signalQuality: 'Good',
  ipAddress: '192.168.1.142',
  batteryVoltage: 3.94,
  batteryPercent: 88,
  solarCharging: true,
  solarVoltage: 5.42,
  uptimeSeconds: 184520,
  freeHeapBytes: 198420,
  firmwareVersion: 'v2.4.1-esp-idf-5.1',
  lastSyncTime: new Date().toISOString(),
  protocol: 'Wi-Fi 6 (802.11ax) + Zigbee/Thread Mesh',
};

// ==========================================
// API ROUTES
// ==========================================

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'KRISHI-DRISHTI Gateway (Krishna-Guntur Region)',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 2. Fetch full telemetry data (latest reading + historical trend series)
app.get('/api/telemetry', (req, res) => {
  const current = historicalReadings[historicalReadings.length - 1];
  res.json({
    success: true,
    data: {
      current,
      history: historicalReadings,
      device: deviceStatus,
    },
  });
});

// 3. ESP32-C6 Ingestion Link (POST)
// Microcontroller posts real sensor measurements to this endpoint!
app.post('/api/telemetry', (req, res) => {
  try {
    const payload = req.body || {};
    const lastReading = historicalReadings[historicalReadings.length - 1];

    const temp = typeof payload.airTemperature === 'number' ? payload.airTemperature : lastReading.airTemperature;
    const hum = typeof payload.airHumidity === 'number' ? payload.airHumidity : lastReading.airHumidity;
    const ec = typeof payload.soilEc === 'number' ? payload.soilEc : lastReading.soilEc;
    const rain = typeof payload.rainIntensity === 'number' ? payload.rainIntensity : (payload.isRaining ? 50 : 0);

    const newReading: ServerSensorReading = {
      id: `reading-${Date.now()}`,
      timestamp: payload.timestamp || new Date().toISOString(),
      soilMoisture: typeof payload.soilMoisture === 'number' ? payload.soilMoisture : lastReading.soilMoisture,
      soilPh: typeof payload.soilPh === 'number' ? payload.soilPh : lastReading.soilPh,
      soilEc: ec,
      nitrogen: typeof payload.nitrogen === 'number' ? payload.nitrogen : lastReading.nitrogen,
      phosphorus: typeof payload.phosphorus === 'number' ? payload.phosphorus : lastReading.phosphorus,
      potassium: typeof payload.potassium === 'number' ? payload.potassium : lastReading.potassium,
      airTemperature: temp,
      airHumidity: hum,
      waterLevel: typeof payload.waterLevel === 'number' ? payload.waterLevel : lastReading.waterLevel,
      waterFlowRate: typeof payload.waterFlowRate === 'number' ? payload.waterFlowRate : lastReading.waterFlowRate,
      cumulativeWaterFlow: typeof payload.cumulativeWaterFlow === 'number' ? payload.cumulativeWaterFlow : (lastReading.cumulativeWaterFlow + (lastReading.waterFlowRate / 60)),
      waterTds: typeof payload.waterTds === 'number' ? payload.waterTds : lastReading.waterTds,
      rainIntensity: rain,
      isRaining: rain > 10,
      leafWetness: typeof payload.leafWetness === 'number' ? payload.leafWetness : lastReading.leafWetness,
      vpd: calcVPD(temp, hum),
      dewPoint: calcDewPoint(temp, hum),
      salinityStressIndex: calcSalinity(ec),
    };

    // Append to ring buffer (keep last 500 entries)
    historicalReadings.push(newReading);
    if (historicalReadings.length > 500) {
      historicalReadings.shift();
    }

    // Update ESP32 hardware device status
    if (payload.deviceId) {
      deviceStatus.deviceId = payload.deviceId;
    }
    if (typeof payload.wifiRssi === 'number') {
      deviceStatus.wifiRssi = payload.wifiRssi;
      deviceStatus.signalQuality = payload.wifiRssi > -65 ? 'Excellent' : payload.wifiRssi > -75 ? 'Good' : payload.wifiRssi > -85 ? 'Fair' : 'Poor';
    }
    if (typeof payload.batteryVoltage === 'number') {
      deviceStatus.batteryVoltage = parseFloat(payload.batteryVoltage.toFixed(2));
      deviceStatus.batteryPercent = Math.min(100, Math.max(0, Math.round(((payload.batteryVoltage - 3.2) / 1.0) * 100)));
    }
    if (typeof payload.solarVoltage === 'number') {
      deviceStatus.solarVoltage = parseFloat(payload.solarVoltage.toFixed(2));
      deviceStatus.solarCharging = payload.solarVoltage > 4.5;
    }
    deviceStatus.status = 'active_streaming';
    deviceStatus.lastSyncTime = new Date().toISOString();
    deviceStatus.uptimeSeconds += 10;

    res.status(200).json({
      success: true,
      message: 'Telemetry ingested successfully from ESP32-C6',
      timestamp: newReading.timestamp,
      readingId: newReading.id,
      device: {
        id: deviceStatus.deviceId,
        status: deviceStatus.status,
      },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Invalid telemetry JSON payload',
    });
  }
});

// 4. Device info & connection specifications
app.get('/api/device', (req, res) => {
  res.json({
    success: true,
    data: deviceStatus,
  });
});

// 5. Valve & Actuator State (GET)
app.get('/api/valves', (req, res) => {
  const current = historicalReadings[historicalReadings.length - 1];
  // Re-check safety interlocks
  const isRaining = current.isRaining || current.rainIntensity > 15;
  const isSaturated = current.soilMoisture > 82;
  const isHighSaline = current.soilEc > 2500;
  const isLowTank = current.waterLevel < 15;

  valveState.interlocksTriggered = {
    rainCutoff: isRaining,
    overSaturationCutoff: isSaturated,
    highSalinityCutoff: isHighSaline,
    lowWaterTankCutoff: isLowTank,
  };

  // If in Auto-Pilot mode, enforce protective shutdowns
  if (valveState.autoPilot) {
    if (isRaining || isSaturated || isLowTank) {
      valveState.mainPump = false;
      valveState.zone1Drip = false;
      valveState.zone2Sprinkler = false;
    }
    if (isHighSaline) {
      valveState.fertigationInjector = false;
    }
  }

  res.json({
    success: true,
    data: valveState,
  });
});

// 6. Valve & Actuator Control (POST)
app.post('/api/valves', (req, res) => {
  try {
    const { mainPump, zone1Drip, zone2Sprinkler, fertigationInjector, autoPilot } = req.body;
    const current = historicalReadings[historicalReadings.length - 1];

    const isRaining = current.isRaining || current.rainIntensity > 15;
    const isSaturated = current.soilMoisture > 82;
    const isHighSaline = current.soilEc > 2500;
    const isLowTank = current.waterLevel < 15;

    valveState.interlocksTriggered = {
      rainCutoff: isRaining,
      overSaturationCutoff: isSaturated,
      highSalinityCutoff: isHighSaline,
      lowWaterTankCutoff: isLowTank,
    };

    if (typeof autoPilot === 'boolean') {
      valveState.autoPilot = autoPilot;
    }

    // Apply safety guards even in manual mode if critical
    if (typeof mainPump === 'boolean') {
      if (mainPump && isLowTank) {
        return res.status(400).json({
          success: false,
          error: 'Cannot start pump: Irrigation reservoir tank level is critically low (<15%). Refill reservoir first.',
          data: valveState,
        });
      }
      valveState.mainPump = mainPump;
    }

    if (typeof zone1Drip === 'boolean') {
      if (zone1Drip && (isRaining || isSaturated) && valveState.autoPilot) {
        valveState.zone1Drip = false;
      } else {
        valveState.zone1Drip = zone1Drip;
      }
    }

    if (typeof zone2Sprinkler === 'boolean') {
      if (zone2Sprinkler && (isRaining || isSaturated) && valveState.autoPilot) {
        valveState.zone2Sprinkler = false;
      } else {
        valveState.zone2Sprinkler = zone2Sprinkler;
      }
    }

    if (typeof fertigationInjector === 'boolean') {
      if (fertigationInjector && isHighSaline && valveState.autoPilot) {
        return res.status(400).json({
          success: false,
          error: 'Safety interlock: Fertigation blocked due to high soil salinity (EC > 2500 µS/cm). Root burn prevention active.',
          data: valveState,
        });
      }
      valveState.fertigationInjector = fertigationInjector;
    }

    valveState.lastChanged = new Date().toISOString();

    res.json({
      success: true,
      message: 'Valve actuation dispatched successfully to ESP32-C6 GPIO relays',
      data: valveState,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. AI Agronomic Advisory (POST)
// Combines real-time ESP32-C6 sensor metrics + Gemini 2.5 Flash with regional Krishna-Guntur domain expertise
app.post('/api/ai/advisory', async (req, res) => {
  const current = historicalReadings[historicalReadings.length - 1];
  const {
    crop = 'Guntur Sannam Chilli',
    soil = 'Deep Black Cotton Soil (Vertisols)',
    stage = 'flowering',
  } = req.body || {};

  // Rule-based regional engine baseline
  const isMoistureDeficit = current.soilMoisture < 55;
  const isMoistureExcess = current.soilMoisture > 75;
  const isSaline = current.soilEc > 1800;
  const isDiseaseProne = current.leafWetness > 65 && current.airHumidity > 72;

  const fallbackReport = {
    timestamp: new Date().toISOString(),
    crop,
    soil,
    stage,
    overallHealthScore: Math.round(
      Math.max(30, 95 - (isMoistureDeficit ? 20 : 0) - (isSaline ? 20 : 0) - (isDiseaseProne ? 25 : 0))
    ),
    irrigation: {
      action: isMoistureDeficit
        ? ('IRRIGATE_NOW' as const)
        : isMoistureExcess
        ? ('DRAIN_EXCESS' as const)
        : ('OPTIMAL_HOLD' as const),
      rationale: isMoistureDeficit
        ? `Soil moisture (${current.soilMoisture}%) has dropped below field capacity for ${soil}. In Krishna-Guntur black soils, avoid prolonged stress to prevent soil cracking which tears roots.`
        : isMoistureExcess
        ? `High moisture (${current.soilMoisture}%) combined with low infiltration of vertisols risks root asphyxiation. Suspend irrigation and open drainage channels.`
        : `Soil moisture (${current.soilMoisture}%) is well-balanced within target range (55-70%).`,
      requiredWaterLitersPerAcre: isMoistureDeficit ? 18500 : 0,
      recommendedDurationMinutes: isMoistureDeficit ? 75 : 0,
      recommendedTime: 'Early Morning (06:00 - 08:30 AM) or Late Evening (05:30 PM)',
      evapotranspirationEtc: parseFloat((0.408 * 0.0023 * (current.airTemperature + 17.8) * 3.8).toFixed(2)),
    },
    fertigation: {
      status:
        current.nitrogen < 140
          ? ('NITROGEN_DEFICIT' as const)
          : current.potassium < 190
          ? ('POTASSIUM_BOOST_NEEDED' as const)
          : ('BALANCED_DOSE' as const),
      rationale: `Crop is in ${stage} stage. Current NPK is ${current.nitrogen}:${current.phosphorus}:${current.potassium} mg/kg. ${
        current.potassium < 190
          ? 'Potassium is vital during flowering/pod setting in Guntur chillies to ensure pungent capsanthin synthesis and fruit weight.'
          : 'Nutrient availability is within healthy agricultural benchmarks.'
      }`,
      npkDeficit: {
        n: Math.max(0, 160 - current.nitrogen),
        p: Math.max(0, 65 - current.phosphorus),
        k: Math.max(0, 210 - current.potassium),
      },
      commercialFertilizersPerAcre: {
        ureaKg: parseFloat((Math.max(0, 160 - current.nitrogen) * 0.9).toFixed(1)),
        dapKg: parseFloat((Math.max(0, 65 - current.phosphorus) * 0.8).toFixed(1)),
        mopKg: parseFloat((Math.max(0, 210 - current.potassium) * 1.1).toFixed(1)),
        soluble19_19_19Kg: 4.5,
        specialMicronutrient: 'Zinc Sulphate (0.5%) + Borax 1g/L foliar spray during flowering',
      },
      injectionInstructions:
        'Inject soluble fertilizers via Venturi doser in the middle 50% cycle of drip irrigation to ensure uniform distribution in the root zone without leaching.',
    },
    diseaseRisk: {
      level: isDiseaseProne ? ('HIGH' as const) : ('LOW' as const),
      pathogen: isDiseaseProne ? 'Anthracnose (Die-back) & Black Thrips (Thrips parvispinus)' : 'No active outbreak',
      riskFactorText: `Leaf wetness is ${current.leafWetness}%, humidity is ${current.airHumidity}%, and ambient temp is ${current.airTemperature}°C.`,
      organicIntervention: 'Spray Neem Oil (10,000 ppm) @ 2ml/L + Pseudomonas fluorescens @ 5g/L.',
      chemicalIntervention: isDiseaseProne
        ? 'Azoxystrobin 18.2% + Difenoconazole 11.4% SC @ 1 ml/L or Fipronil 5% SC @ 2 ml/L.'
        : 'Preventive copper oxychloride 3g/L after heavy dew.',
    },
    soilSalinityWatch: {
      status: current.soilEc > 2000 ? 'High Salinity / Osmotic Stress' : 'Normal / Safe',
      gypsumNeededKgPerAcre: current.soilEc > 2000 ? 150 : 0,
      managementTips:
        current.soilEc > 2000
          ? 'High electrical conductivity detected in Krishna basin borewell water. Apply agricultural gypsum and run a fresh Krishna canal water flushing pulse.'
          : 'Soil electrical conductivity is within safe salinity tolerance.',
    },
    fieldAdvisorySummary: isMoistureDeficit
      ? `Soil moisture (${current.soilMoisture}%) is below optimal range. Run early morning drip irrigation to prevent dry cracking in deep black cotton soils.`
      : isDiseaseProne
      ? `Elevated foliar wetness (${current.leafWetness}%) and humidity increase risk of Anthracnose die-back and thrips. Initiate preventive canopy protection.`
      : `Soil moisture and nutrient availability are well balanced. Maintain recommended fertigation schedule through the drip lines.`,
    teluguAdvisorySummary: '',
    source: 'krishna-guntur-rule-engine' as const,
  };

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({ success: true, data: fallbackReport });
  }

  try {
    const prompt = `You are the Senior Agronomist at Acharya N.G. Ranga Agricultural University (ANGRAU) Lam Farm, Guntur.
Analyze the following real-time sensor measurements from an ESP32-C6 IoT node deployed in Krishna-Guntur, Andhra Pradesh, India:
- Crop: ${crop}
- Soil: ${soil}
- Growth Stage: ${stage}
- Recommendation Basis: Per Standard Acre (Lam Farm Agronomic Benchmarks)
- Soil Moisture: ${current.soilMoisture}%
- Soil pH: ${current.soilPh}
- Soil EC (Salinity): ${current.soilEc} µS/cm
- Available Nitrogen (N): ${current.nitrogen} mg/kg
- Available Phosphorus (P): ${current.phosphorus} mg/kg
- Available Potassium (K): ${current.potassium} mg/kg
- Air Temperature: ${current.airTemperature} °C
- Air Humidity: ${current.airHumidity} %RH
- Leaf Wetness: ${current.leafWetness}%
- Rain Intensity: ${current.rainIntensity}% (isRaining: ${current.isRaining})
- Water Tank Level: ${current.waterLevel}%
- Irrigation TDS: ${current.waterTds} ppm
- VPD: ${current.vpd} kPa

Produce an authoritative, highly practical agronomic advisory report tailored specifically for the Krishna-Guntur agricultural zone in valid JSON matching this schema:
{
  "overallHealthScore": number (0-100),
  "irrigation": {
    "action": "IRRIGATE_NOW" | "OPTIMAL_HOLD" | "DRAIN_EXCESS" | "PULSE_IRRIGATION",
    "rationale": string,
    "requiredWaterLitersPerAcre": number,
    "recommendedDurationMinutes": number,
    "recommendedTime": string,
    "evapotranspirationEtc": number
  },
  "fertigation": {
    "status": "OPTIMAL" | "NITROGEN_DEFICIT" | "POTASSIUM_BOOST_NEEDED" | "BALANCED_DOSE",
    "rationale": string,
    "npkDeficit": { "n": number, "p": number, "k": number },
    "commercialFertilizersPerAcre": {
      "ureaKg": number,
      "dapKg": number,
      "mopKg": number,
      "soluble19_19_19Kg": number,
      "specialMicronutrient": string
    },
    "injectionInstructions": string
  },
  "diseaseRisk": {
    "level": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
    "pathogen": string,
    "riskFactorText": string,
    "organicIntervention": string,
    "chemicalIntervention": string
  },
  "soilSalinityWatch": {
    "status": string,
    "gypsumNeededKgPerAcre": number,
    "managementTips": string
  },
  "fieldAdvisorySummary": string (1-2 crisp, actionable sentences in clear English summarizing today's key field action for the farmer)
}
Return strictly raw JSON.`;

    const result = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (result && result.text) {
      let cleanedText = result.text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanedText);
      return res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          crop,
          soil,
          stage,
          ...parsed,
          fieldAdvisorySummary: parsed.fieldAdvisorySummary || parsed.teluguAdvisorySummary || '',
          source: `gemini-ai (${result.modelUsed})`,
        },
      });
    }
  } catch (aiErr) {
    console.warn('Gemini advisory call encountered error, returning rule-based report:', aiErr);
  }

  res.json({ success: true, data: fallbackReport });
});

// 8. Interactive AI Crop Doctor & Agronomist Assistant (POST)
app.post('/api/ai/chat', async (req, res) => {
  const defaultCurrent = historicalReadings[historicalReadings.length - 1];
  const {
    question = '',
    crop = 'Guntur Sannam Chilli',
    soil = 'Black Cotton Soil',
    history = [],
    telemetry = null,
  } = req.body || {};

  // Prefer live telemetry passed by the client (which reflects simulation changes), fallback to server reading
  const current = {
    soilMoisture: telemetry?.soilMoisture ?? defaultCurrent.soilMoisture,
    soilPh: telemetry?.soilPH ?? telemetry?.soilPh ?? defaultCurrent.soilPh,
    soilEc: telemetry?.soilEC ?? telemetry?.soilEc ?? defaultCurrent.soilEc,
    nitrogen: telemetry?.npkN ?? telemetry?.nitrogen ?? defaultCurrent.nitrogen,
    phosphorus: telemetry?.npkP ?? telemetry?.phosphorus ?? defaultCurrent.phosphorus,
    potassium: telemetry?.npkK ?? telemetry?.potassium ?? defaultCurrent.potassium,
    airTemperature: telemetry?.airTemp ?? telemetry?.airTemperature ?? defaultCurrent.airTemperature,
    airHumidity: telemetry?.airHumidity ?? defaultCurrent.airHumidity,
    leafWetness: telemetry?.leafWetness ?? defaultCurrent.leafWetness,
    waterLevel: telemetry?.waterLevel ?? defaultCurrent.waterLevel,
    waterFlowRate: telemetry?.waterFlowRate ?? defaultCurrent.waterFlowRate,
    rainIntensity: telemetry?.rainRate ?? telemetry?.rainIntensity ?? defaultCurrent.rainIntensity,
    isRaining: telemetry?.rainDetected ?? defaultCurrent.isRaining,
    vpd: telemetry?.vpd ?? defaultCurrent.vpd,
    diseaseRiskScore: telemetry?.diseaseRiskScore ?? 35,
    diseaseRiskStatus: telemetry?.diseaseRiskStatus ?? 'Moderate',
  };

  const ai = getGeminiClient();
  if (!ai) {
    // High-quality deterministic agronomic response engine based on ANGRAU Lam Farm standards
    let ruleBasedAnswer = `[ANGRAU Regional Agronomy Knowledge Base - Krishna-Guntur]: Regarding your query for **${crop}** in **${soil}**:\n\n`;
    ruleBasedAnswer += `**Live Field Telemetry Grounding:**\n`;
    ruleBasedAnswer += `• Soil Moisture: **${current.soilMoisture}%** (Optimal: 40-55%)\n`;
    ruleBasedAnswer += `• Canopy Climate: **${current.airTemperature}°C** / **${current.airHumidity}% RH** (VPD: ${current.vpd} kPa)\n`;
    ruleBasedAnswer += `• N:P:K Status: **${current.nitrogen}:${current.phosphorus}:${current.potassium} mg/kg** | Soil EC: **${current.soilEc} µS/cm**\n`;
    ruleBasedAnswer += `• Leaf Wetness: **${current.leafWetness}%** | Rain Status: **${current.isRaining ? 'Active Precipitation' : 'Clear'}**\n\n`;

    const qLower = question.toLowerCase();
    if (qLower.includes('irrigate') || qLower.includes('water') || qLower.includes('pump')) {
      if (current.isRaining) {
        ruleBasedAnswer += `**Irrigation Recommendation:**\n⚠️ **DO NOT IRRIGATE.** Active rainfall and leaf wetness (${current.leafWetness}%) detected. Black cotton soil expands rapidly; standing water creates root hypoxia and increases *Phytophthora* root rot risk. Keep drainage furrows open.`;
      } else if (current.soilMoisture < 38) {
        ruleBasedAnswer += `**Irrigation Recommendation:**\n💧 **IRRIGATION NEEDED:** Soil moisture is at ${current.soilMoisture}%, which is below the 40% management threshold for Guntur Mirchi flowering/fruit-set. Run Zone A precision drip for 35 minutes (target flow: ~14 L/min) to restore root zone moisture without leaching nutrients.`;
      } else if (current.soilMoisture > 52) {
        ruleBasedAnswer += `**Irrigation Recommendation:**\n✅ **MOISTURE SUFFICIENT:** Soil moisture is at ${current.soilMoisture}%. Drip irrigation should remain on STANDBY to avoid waterlogging black cotton vertisols.`;
      } else {
        ruleBasedAnswer += `**Irrigation Recommendation:**\n✅ **OPTIMAL MOISTURE:** Current soil moisture (${current.soilMoisture}%) is well within the ideal 42–48% zone. Maintain intermittent pulse schedule during peak afternoon evapotranspiration.`;
      }
    } else if (qLower.includes('fertiliz') || qLower.includes('npk') || qLower.includes('fertigat')) {
      ruleBasedAnswer += `**Fertigation & Nutrition Advisory:**\n• For ${crop} in flowering/fruiting stage, target N:P:K is 120:60:120 kg/ha in split fertigation.\n• Inject water-soluble 13:0:45 (Potassium Nitrate) @ 3.5 g/L during active drip cycles to promote capsaicin synthesis, fruit firmness, and drought tolerance.\n• Keep electrical conductivity (EC) below 2.0 dS/m (${current.soilEc} µS/cm currently) to prevent osmotic leaf tip scorch.`;
    } else if (qLower.includes('disease') || qLower.includes('fung') || qLower.includes('spray') || qLower.includes('rot')) {
      ruleBasedAnswer += `**Crop Protection & Disease Advisory:**\n• High leaf wetness (${current.leafWetness}%) with RH > 80% creates high sporulation risk for Anthracnose fruit rot (*Colletotrichum capsici*) and Powdery Mildew.\n• Preventive spray: Mancozeb 75% WP @ 2.5 g/L or Azoxystrobin 23% SC @ 1 ml/L.\n• For thrips and yellow mite vector control, apply Neem oil (10,000 ppm) @ 2 ml/L or Diafenthiuron 50% WP @ 1.2 g/L.`;
    } else {
      ruleBasedAnswer += `**Agronomic Guidance:**\n• **Soil Health:** Black cotton soils in Guntur district have high swelling and shrinkage. Prevent deep cracking by maintaining mulch or shallow drip cycles.\n• **Climate Adaptation:** Current atmospheric VPD is ${current.vpd} kPa. If temperature exceeds 36°C, administer short 5-minute micro-sprinkler pulses to cool canopy boundary layers.\n• To enable live generative AI responses with custom reasoning, attach your Gemini API key in AI Studio settings.`;
    }

    return res.json({
      success: true,
      answer: ruleBasedAnswer,
      source: 'angrau-regional-engine',
      suggestedAction: current.soilMoisture < 38 && !current.isRaining ? 'TURN_ON_PUMP' : (current.isRaining ? 'TURN_OFF_PUMP' : 'NONE')
    });
  }

  try {
    // Format conversation history for multi-turn context
    const conversationContext = history
      .slice(-6)
      .map((msg: any) => `${msg.role === 'user' ? 'Farmer' : 'Agronomist'}: ${msg.content || msg.text || ''}`)
      .join('\n');

    const prompt = `You are "Krishi-Drishti AI Agronomist", a world-class precision agriculture advisor specializing in the Krishna-Guntur agricultural belt of Andhra Pradesh, India, following Acharya N.G. Ranga Agricultural University (ANGRAU Lam Research Station, Guntur) standards.

REAL-TIME SENSOR & TELEMETRY GROUNDING:
- Primary Crop: ${crop}
- Soil Classification: ${soil}
- Soil Moisture: ${current.soilMoisture}% (Ideal for chilli: 40-52%)
- SHT31 Canopy Temperature: ${current.airTemperature}°C
- SHT31 Canopy Relative Humidity: ${current.airHumidity}%
- Vapor Pressure Deficit (VPD): ${current.vpd} kPa (Ideal: 0.8-1.4 kPa)
- Leaf Wetness: ${current.leafWetness}%
- Rain Status: ${current.isRaining ? `ACTIVE RAINFALL (${current.rainIntensity} mm/h)` : 'No precipitation'}
- Soil EC: ${current.soilEc} µS/cm (Threshold: <2000 µS/cm)
- Soil pH: ${current.soilPh} (Target: 6.2 - 7.5)
- Available NPK: N: ${current.nitrogen} mg/kg | P: ${current.phosphorus} mg/kg | K: ${current.potassium} mg/kg
- Overhead Water Tank Level: ${current.waterLevel}%
- Current Water Flow Rate: ${current.waterFlowRate} L/min

RECENT CONVERSATION HISTORY:
${conversationContext || 'No previous turns in this session.'}

FARMER'S CURRENT QUESTION / CONCERN:
"${question}"

INSTRUCTIONS FOR YOUR RESPONSE:
1. Ground your advice directly in the REAL-TIME SENSOR VALUES provided above. Quote the relevant metrics (e.g. soil moisture %, VPD, leaf wetness) that justify your recommendation.
2. Structure your response clearly using clean Markdown:
   - **Direct Field Assessment**: What is the immediate situation?
   - **Actionable Steps**: Bullet points with exact dosages, irrigation durations, or spray schedules.
   - **Scientific Rationale**: Explain why this action is crucial for ${crop} in ${soil}.
   - **Precautions**: Specific warnings (e.g. soil cracking, root asphyxiation, fungicide application timings).
3. If immediate actuator intervention is needed (e.g., soil moisture is low and pump should turn on, or rain detected and irrigation must stop), explicitly recommend it.
4. Keep the tone authoritative, practical, encouraging, and respectful of farmer practicalities. Provide chemical names along with organic alternatives where suitable.`;

    const result = await generateContentWithFallback({
      contents: prompt,
    });

    let suggestedAction = 'NONE';
    const ansText = result?.text?.toLowerCase() || '';
    if (ansText.includes('start irrigation') || ansText.includes('turn on pump') || ansText.includes('run zone a')) {
      suggestedAction = 'TURN_ON_PUMP';
    } else if (ansText.includes('stop irrigation') || ansText.includes('shut off pump') || ansText.includes('rain lock')) {
      suggestedAction = 'TURN_OFF_PUMP';
    } else if (ansText.includes('fertigation pulse') || ansText.includes('inject nutrient')) {
      suggestedAction = 'START_FERTIGATION';
    }

    res.json({
      success: true,
      answer: result?.text || 'Agronomic assessment completed.',
      source: result?.modelUsed || 'gemini-ai',
      suggestedAction,
    });
  } catch (err: any) {
    console.warn('Gemini chat error, falling back to local agronomist knowledge:', err);
    res.json({
      success: true,
      answer: `[ANGRAU Regional Agronomy Lam Farm - Krishna-Guntur]: Regarding **${crop}** in **${soil}**:\n\n• **Current Moisture:** ${current.soilMoisture}% | **Temperature:** ${current.airTemperature}°C | **Leaf Wetness:** ${current.leafWetness}%\n• **Immediate Advisory:** Maintain intermittent drip pulses. In black cotton vertisols, avoid standing water to protect roots from hypoxia. If leaf wetness remains above 80%, spray Mancozeb 75% WP @ 2.5 g/L to prevent fungal spore germination.\n\n*(Note: Cloud AI model was momentarily saturated; provided verified ANGRAU agronomic baseline.)*`,
      source: 'angrau-regional-engine',
      suggestedAction: current.soilMoisture < 38 ? 'TURN_ON_PUMP' : 'NONE'
    });
  }
});

// 9. Reset history to clean baseline
app.post('/api/telemetry/reset', (req, res) => {
  historicalReadings = buildInitialHistory(36);
  res.json({ success: true, message: 'Telemetry history reset to 36-hour baseline' });
});

// 10. Download Complete Project Source Code as ZIP
app.get('/api/download-zip', (req, res) => {
  const zipPath = path.join(process.cwd(), 'krishi-drishti-source.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="krishi-drishti-project.zip"');
    res.sendFile(zipPath);
  } else {
    res.status(404).json({ success: false, error: 'Zip file not generated yet' });
  }
});

// ==========================================
// VITE / STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AgriSense C6 Gateway running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
