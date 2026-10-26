import { TelemetryReading, SensorMetric, HistogramBin, CropStage, TrialComparison, CorrelationPair } from '../types';

export function calculateMean(arr: number[]): number {
  if (!arr.length) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return Number((sum / arr.length).toFixed(2));
}

export function calculateMedian(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
    : Number(sorted[mid].toFixed(2));
}

export function calculateStdDev(arr: number[], meanVal?: number): number {
  if (arr.length < 2) return 0;
  const m = meanVal !== undefined ? meanVal : calculateMean(arr);
  const variance = arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (arr.length - 1);
  return Number(Math.sqrt(variance).toFixed(2));
}

export function calculatePercentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  const weight = pos - lower;
  return lower === upper ? sorted[lower] : Number((sorted[lower] * (1 - weight) + sorted[upper] * weight).toFixed(2));
}

export function calculatePearsonCorrelation(arrA: number[], arrB: number[]): number {
  const n = Math.min(arrA.length, arrB.length);
  if (n < 2) return 0;
  const sliceA = arrA.slice(0, n);
  const sliceB = arrB.slice(0, n);
  const meanA = calculateMean(sliceA);
  const meanB = calculateMean(sliceB);
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const diffA = sliceA[i] - meanA;
    const diffB = sliceB[i] - meanB;
    num += diffA * diffB;
    denA += diffA * diffA;
    denB += diffB * diffB;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : Number((num / den).toFixed(3));
}

export function calculateHistogramBins(arr: number[], binCount = 8): HistogramBin[] {
  if (!arr.length) return [];
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  if (min === max) {
    return [{ binLabel: `${min}`, count: arr.length, min, max }];
  }
  const binWidth = (max - min) / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
    const bMin = min + i * binWidth;
    const bMax = bMin + binWidth;
    return {
      binLabel: `${bMin.toFixed(1)}-${bMax.toFixed(1)}`,
      min: bMin,
      max: bMax,
      count: 0
    };
  });

  arr.forEach(val => {
    let index = Math.floor((val - min) / binWidth);
    if (index >= binCount) index = binCount - 1;
    if (index < 0) index = 0;
    bins[index].count++;
  });

  return bins;
}

export function calculateVPD(airTemp: number, airHumidity: number): number {
  const svp = 0.61078 * Math.exp((17.27 * airTemp) / (airTemp + 237.3));
  const avp = svp * (airHumidity / 100);
  return Number(Math.max(0, svp - avp).toFixed(2));
}

export function calculateET0(airTemp: number, airHumidity: number, solarRadiation = 550): number {
  const vpd = calculateVPD(airTemp, airHumidity);
  const et0 = 0.0023 * (solarRadiation * 0.0864) * Math.sqrt(Math.max(1, airTemp - 12)) * (airTemp + 17.8) * 0.05 + vpd * 0.8;
  return Number(Math.min(10, Math.max(1.5, et0)).toFixed(2));
}

export function generateInitialTelemetry(): TelemetryReading[] {
  const readings: TelemetryReading[] = [];
  const now = new Date();
  let cumulativeFlow = 840;

  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = timestamp.getHours();
    const isDay = hour >= 6 && hour <= 18;
    const diurnalFactor = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));

    const airTemp = Number((24 + diurnalFactor * 11 + (Math.random() * 1.5 - 0.75)).toFixed(1));
    const airHumidity = Number((85 - diurnalFactor * 35 + (Math.random() * 3 - 1.5)).toFixed(1));
    const solarRadiation = Math.round(isDay ? diurnalFactor * 750 + Math.random() * 50 : 0);

    const isMorningIrrigation = hour === 7;
    const soilMoisture = isMorningIrrigation
      ? 48.5
      : Number((42 - diurnalFactor * 6 + (Math.random() * 2 - 1)).toFixed(1));
    const soilTemp = Number((22 + diurnalFactor * 6 + (Math.random() * 0.8 - 0.4)).toFixed(1));
    const soilPH = Number((6.6 + Math.sin(hour / 4) * 0.15 + (Math.random() * 0.1 - 0.05)).toFixed(2));
    const soilEC = Number((1.35 + Math.sin(hour / 6) * 0.12 + (Math.random() * 0.06 - 0.03)).toFixed(2));

    const npkN = Math.round(185 - hour * 0.4 + (Math.random() * 6 - 3));
    const npkP = Math.round(44 - hour * 0.1 + (Math.random() * 3 - 1.5));
    const npkK = Math.round(210 - hour * 0.3 + (Math.random() * 5 - 2.5));

    const waterLevel = Math.round(78 - (24 - i) * 0.8 + (hour === 5 ? 20 : 0));
    const waterTankVolume = Math.round((waterLevel / 100) * 1500);
    const waterFlowRate = isMorningIrrigation
      ? Number((14.2 + (Math.random() * 1.5 - 0.75)).toFixed(1))
      : 0;

    if (isMorningIrrigation) {
      cumulativeFlow += 85;
    }

    const rainDetected = hour === 3;
    const rainRate = rainDetected ? 1.8 : 0;
    const leafWetness = rainDetected
      ? 78
      : Math.max(8, Math.round((1 - diurnalFactor) * 65 + (Math.random() * 6 - 3)));
    const waterTDS = Math.round(245 + Math.sin(hour / 3) * 15 + (Math.random() * 8 - 4));

    const solarChargingCurrent = isDay ? Math.round(diurnalFactor * 320) : 0;
    const esp32Battery = Number(
      (3.82 + (solarChargingCurrent > 50 ? 0.28 : -0.08) + (Math.random() * 0.04 - 0.02)).toFixed(2)
    );
    const esp32Rssi = Math.round(-64 + (Math.random() * 6 - 3));
    const esp32CpuTemp = Number((34 + diurnalFactor * 12 + Math.random() * 1.2).toFixed(1));

    const vpd = calculateVPD(airTemp, airHumidity);
    const et0 = calculateET0(airTemp, airHumidity, solarRadiation);

    let riskScore = Math.round(leafWetness * 0.5 + (airHumidity > 75 ? airHumidity - 75 : 0) * 1.5);
    riskScore = Math.min(100, Math.max(0, riskScore));
    let diseaseStatus: 'Low' | 'Moderate' | 'High' | 'Severe' = 'Low';
    if (riskScore > 75) diseaseStatus = 'Severe';
    else if (riskScore > 50) diseaseStatus = 'High';
    else if (riskScore > 30) diseaseStatus = 'Moderate';

    readings.push({
      id: `reading-${24 - i}`,
      timestamp: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeLabel: `${timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      soilMoisture,
      airTemp,
      airHumidity,
      soilTemp,
      soilPH,
      soilEC,
      npkN,
      npkP,
      npkK,
      waterLevel,
      waterTankVolume,
      waterFlowRate,
      cumulativeWaterFlow: cumulativeFlow,
      rainDetected,
      rainRate,
      leafWetness,
      waterTDS,
      esp32Battery,
      esp32Rssi,
      esp32CpuTemp,
      solarChargingCurrent,
      solarRadiation,
      vpd,
      et0,
      diseaseRiskScore: riskScore,
      diseaseRiskStatus: diseaseStatus
    });
  }

  return readings;
}

export function computeSensorMetrics(readings: TelemetryReading[]): SensorMetric[] {
  const getValues = (key: string) =>
    readings.map(r => (typeof r[key] === 'number' ? (r[key] as number) : 0));

  const createMetric = (
    key: string,
    label: string,
    sensorModel: string,
    category: SensorMetric['category'],
    unit: string,
    idealRange: [number, number],
    color: string,
    description: string
  ): SensorMetric => {
    const vals = getValues(key);
    const current = vals[vals.length - 1];
    const mean = calculateMean(vals);
    const median = calculateMedian(vals);
    const stdDev = calculateStdDev(vals, mean);
    const variance = Number((stdDev * stdDev).toFixed(3));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const q25 = calculatePercentile(vals, 25);
    const q75 = calculatePercentile(vals, 75);

    let status: SensorMetric['status'] = 'optimal';
    if (current < idealRange[0] || current > idealRange[1]) {
      const buffer = (idealRange[1] - idealRange[0]) * 0.25;
      if (current < idealRange[0] - buffer || current > idealRange[1] + buffer) {
        status = 'critical';
      } else {
        status = 'warning';
      }
    }

    return {
      key,
      label,
      sensorModel,
      category,
      unit,
      current,
      mean,
      median,
      stdDev,
      variance,
      min,
      max,
      q25,
      q75,
      idealRange,
      status,
      description,
      color
    };
  };

  return [
    createMetric(
      'soilMoisture',
      'Soil Moisture',
      'Capacitive V2.0',
      'soil',
      '%',
      [35, 55],
      '#059669',
      'Volumetric water content in root rhizosphere (target 40-50% for Krishna-Guntur loam)'
    ),
    createMetric(
      'airTemp',
      'Air Temperature',
      'Sensirion SHT31-D',
      'atmosphere',
      '°C',
      [22, 34],
      '#ea580c',
      'Ambient canopy temperature measured via high-precision SHT31 I2C interface'
    ),
    createMetric(
      'airHumidity',
      'Relative Humidity',
      'Sensirion SHT31-D',
      'atmosphere',
      '%',
      [55, 80],
      '#0284c7',
      'Canopy atmospheric moisture content for transpiration balance'
    ),
    createMetric(
      'soilPH',
      'Soil pH',
      'Analog Industrial pH Probe',
      'soil',
      'pH',
      [6.0, 7.5],
      '#8b5cf6',
      'Acidity/Alkalinity level determining micronutrient bioavailability'
    ),
    createMetric(
      'soilEC',
      'Electrical Conductivity (EC)',
      'RS485 Modbus EC Sensor',
      'soil',
      'dS/m',
      [0.8, 2.0],
      '#d97706',
      'Soil salinity and dissolved nutrient ionic concentration'
    ),
    createMetric(
      'npkN',
      'Soil Nitrogen (N)',
      'Optical NPK Probe (RS485)',
      'soil',
      'mg/kg',
      [140, 220],
      '#10b981',
      'Essential for vegetative chlorophyll synthesis and vegetative canopy'
    ),
    createMetric(
      'npkP',
      'Soil Phosphorus (P)',
      'Optical NPK Probe (RS485)',
      'soil',
      'mg/kg',
      [30, 60],
      '#6366f1',
      'Critical for turmeric rhizome initiation, root development & energy transfer'
    ),
    createMetric(
      'npkK',
      'Soil Potassium (K)',
      'Optical NPK Probe (RS485)',
      'soil',
      'mg/kg',
      [180, 260],
      '#ec4899',
      'Crucial for turmeric rhizome bulking, starch accumulation, and drought resilience'
    ),
    createMetric(
      'waterLevel',
      'Storage Tank Level',
      'Non-Contact Ultrasonic',
      'water',
      '%',
      [40, 95],
      '#0ea5e9',
      'Overhead / sump irrigation buffer reservoir level monitor'
    ),
    createMetric(
      'waterFlowRate',
      'Irrigation Flow Rate',
      'Hall Effect YF-S201',
      'water',
      'L/min',
      [0, 25],
      '#2563eb',
      'Precision inline volumetric flow monitoring through drip delivery manifold'
    ),
    createMetric(
      'rainRate',
      'Rainfall Precipitation',
      'Optical Tipping Bucket',
      'atmosphere',
      'mm/h',
      [0, 5],
      '#3b82f6',
      'Instantaneous precipitation rate for automated weather-aware irrigation delay'
    ),
    createMetric(
      'leafWetness',
      'Leaf Wetness Index',
      'Dielectric Surface Grid',
      'agronomy',
      '%',
      [0, 40],
      '#14b8a6',
      'Moisture film duration on foliage; primary trigger for fungal leaf spot/blight'
    ),
    createMetric(
      'waterTDS',
      'Water Quality (TDS)',
      'Gravity TDS Meter',
      'water',
      'ppm',
      [150, 450],
      '#64748b',
      'Total Dissolved Solids in source water to prevent emitter clogging & salt toxicity'
    ),
    createMetric(
      'esp32Battery',
      'ESP32-C6 Supply Voltage',
      'Internal ADC Divider',
      'hardware',
      'V',
      [3.6, 4.2],
      '#84cc16',
      'Solar-backed LiFePO4 battery rail on ESP32-C6 RISC-V edge controller node'
    ),
    createMetric(
      'vpd',
      'Vapor Pressure Deficit',
      'Derived Agronomic Engine',
      'agronomy',
      'kPa',
      [0.8, 1.4],
      '#f59e0b',
      'Evaporative demand of the atmosphere driving crop stomatal conductance'
    )
  ];
}

export const GUNTUR_MIRCHI_STAGES: CropStage[] = [
  {
    stage: 'Nursery & Seedling Vigour',
    period: 'Day 0 to 35',
    parametersMonitored: ['Pro-tray Moisture', 'Soil Temperature (DS18B20)', 'Substrate EC', 'pH'],
    hardwareComponents: ['Capacitive Moisture Sensor', 'DS18B20 Temp Probe', 'EC/TDS Meter', 'Micro-mister Solenoid'],
    softwareComponents: ['Dashboard', 'ESP32 Nursery Node', 'Substrate Monitor'],
    aiModule: 'Seedling Vigour & Damping-off Fungal Prevention Model',
    outputToFarmer: 'Nursery Health Score (96/100) & Pro-tray moisture hardening recommendation prior to field transplanting',
    optimalRanges: {
      soilMoisture: '55 - 65%',
      soilPH: '6.0 - 7.0',
      soilEC: '0.8 - 1.2 dS/m',
      npk: 'N: 120, P: 60, K: 100 mg/kg',
      temp: '24 - 28°C',
      humidity: '65 - 75%'
    }
  },
  {
    stage: 'Transplanting & Vegetative Growth',
    period: 'Day 35 to 70',
    parametersMonitored: ['Root Zone Moisture', 'Canopy Climate (SHT31)', 'Soil EC', 'Basal NPK'],
    hardwareComponents: ['Multi-depth Soil Moisture', 'SHT31 Ambient Sensor', 'Drip Solenoid Zone A', 'ESP32-C6 Node'],
    softwareComponents: ['Precision Drip Engine', 'Canopy Vigour Monitor', 'Soil EC Ingest API'],
    aiModule: 'Canopy Establishment & Thrips / Whitefly Vulnerability Index',
    outputToFarmer: 'Basal fertigation advisory (19:19:19 NPK split) and pulse drip schedule to avoid root rot in black cotton soils',
    optimalRanges: {
      soilMoisture: '45 - 55%',
      soilPH: '6.2 - 7.2',
      soilEC: '1.0 - 1.5 dS/m',
      npk: 'N: 180, P: 50, K: 160 mg/kg',
      temp: '26 - 32°C',
      humidity: '60 - 75%'
    }
  },
  {
    stage: 'Flowering & Bud Initiation',
    period: 'Day 70 to 105',
    parametersMonitored: ['Atmospheric VPD', 'SHT31 Air Temp & RH', 'Leaf Wetness', 'Water Flow (YF-S201)'],
    hardwareComponents: ['SHT31-D I2C', 'Optical Leaf Wetness Grid', 'YF-S201 Flow Sensor', 'Precision Solenoids'],
    softwareComponents: ['VPD Transpiration Engine', 'Blossom Retention Tracker', 'Relay Controller'],
    aiModule: 'Blossom Drop Prevention & High-VPD Heat Stress Mitigator',
    outputToFarmer: 'Atmospheric VPD advisory: Maintain 1.1-1.4 kPa. High-potassium & Boron micronutrient fertigation alert to maximize flower retention',
    optimalRanges: {
      soilMoisture: '48 - 56%',
      soilPH: '6.2 - 6.8',
      soilEC: '1.2 - 1.8 dS/m',
      npk: 'N: 160, P: 65, K: 220 mg/kg',
      temp: '24 - 30°C',
      humidity: '65 - 75%'
    }
  },
  {
    stage: 'Fruit Set & Pod Development',
    period: 'Day 105 to 145',
    parametersMonitored: ['Soil Moisture', 'Water Flow Rate', 'Leaf Wetness Duration', 'Soil Potassium (K)'],
    hardwareComponents: ['YF-S201 Flow Meter', 'Capacitive Probes', 'Fertigation Dosing Pump', 'Rain Gauge'],
    softwareComponents: ['Real-time Flow Tracker', 'Disease Alert Engine', 'Fertigation Controller'],
    aiModule: 'Anthracnose (Fruit Rot / Dieback) Early Warning & Pod Biomass Estimator',
    outputToFarmer: 'Drip fertigation boost (Calcium Nitrate + Potassium Sulphate 0:0:50). Water stress suppression to avoid pod blossom-end rot',
    optimalRanges: {
      soilMoisture: '50 - 60%',
      soilPH: '6.3 - 7.0',
      soilEC: '1.4 - 2.1 dS/m',
      npk: 'N: 150, P: 55, K: 260 mg/kg',
      temp: '25 - 32°C',
      humidity: '60 - 70%'
    }
  },
  {
    stage: 'Fruit Maturation & Red Ripening',
    period: 'Day 145 to 185',
    parametersMonitored: ['Solar Radiation', 'Air Temp (SHT31)', 'Soil Moisture Tapering', 'Water TDS'],
    hardwareComponents: ['Pyranometer / Solar Sensor', 'SHT31 Climate Probe', 'Soil Moisture Array', 'Gravity TDS'],
    softwareComponents: ['Ripening Index Tracker', 'ET0 Evapotranspiration Calculator', 'Deficit Irrigation Module'],
    aiModule: 'Capsanthin Deep-Red Pigment Optimization & Controlled Deficit Irrigation',
    outputToFarmer: 'Controlled deficit alert: Taper soil moisture to 35-42% to stimulate capsaicin & intense red color synthesis without pod shrivelling',
    optimalRanges: {
      soilMoisture: '35 - 45%',
      soilPH: '6.5 - 7.2',
      soilEC: '1.2 - 1.8 dS/m',
      npk: 'N: 100, P: 40, K: 240 mg/kg',
      temp: '22 - 30°C',
      humidity: '50 - 65%'
    }
  },
  {
    stage: 'Harvesting & Sun-Drying / Curing',
    period: 'Day 185 to 215',
    parametersMonitored: ['Canopy & Yard Humidity', 'Rainfall Alert', 'Historical Climate Data'],
    hardwareComponents: ['Rain Sensor', 'SHT31 Ambient Probe', 'ESP32-C6 Edge Gateway'],
    softwareComponents: ['Weather Forecast Sync', 'Curing Yard Alert System', 'Yield Report Engine'],
    aiModule: 'Optimal Picking Window & Open-Yard Solar Curing Forecaster',
    outputToFarmer: 'Harvest picking advisory (First picking cycle). 48-hour zero-precipitation window confirmed for open-yard sun drying (target pod moisture < 10%)',
    optimalRanges: {
      soilMoisture: '25 - 32%',
      soilPH: '6.5 - 7.0',
      soilEC: '0.9 - 1.4 dS/m',
      npk: 'N: 80, P: 30, K: 150 mg/kg',
      temp: '22 - 32°C',
      humidity: '45 - 60%'
    }
  }
];

export const TERRACE_COMPARISON_DATA: TrialComparison[] = [
  {
    parameter: 'Irrigation Method',
    zoneAAutomated: 'AI Precision Drip (Automated Valve)',
    zoneBManual: 'Hand / Hose Flood Watering',
    improvement: '32.6% Water Conservation',
    impactColor: 'text-emerald-700 bg-emerald-50 border-emerald-200'
  },
  {
    parameter: 'Nutrient Delivery',
    zoneAAutomated: 'Automated Dosing Pump (Varying EC)',
    zoneBManual: 'Manual Broadcast Application',
    improvement: '21.4% Fertilizer Reduction',
    impactColor: 'text-blue-700 bg-blue-50 border-blue-200'
  },
  {
    parameter: 'Monitoring Frequency',
    zoneAAutomated: 'ESP32-C6 IoT Telemetry (Every 3s)',
    zoneBManual: 'Manual Visual Inspection',
    improvement: 'Continuous 24/7 Diagnostics',
    impactColor: 'text-purple-700 bg-purple-50 border-purple-200'
  },
  {
    parameter: 'Labor Requirement',
    zoneAAutomated: '0.2 hrs/day (Supervisor audit)',
    zoneBManual: '1.8 hrs/day (Manual dragging hose)',
    improvement: '68.5% Labor Hours Saved',
    impactColor: 'text-amber-700 bg-amber-50 border-amber-200'
  },
  {
    parameter: 'Water Use Efficiency',
    zoneAAutomated: 'High (0.85 L per kg biomass)',
    zoneBManual: 'Low-Moderate (1.32 L per kg)',
    improvement: '+35.6% WUE Increase',
    impactColor: 'text-emerald-700 bg-emerald-50 border-emerald-200'
  },
  {
    parameter: 'Nutrient Leaching Loss',
    zoneAAutomated: '< 4% (Targeted root zone)',
    zoneBManual: '28 - 35% (Deep percolation)',
    improvement: '82% Reduction in Leaching',
    impactColor: 'text-indigo-700 bg-indigo-50 border-indigo-200'
  },
  {
    parameter: 'Disease Incidence',
    zoneAAutomated: '2.1% (Dry foliage, controlled leaf wetness)',
    zoneBManual: '14.8% (Foliar splashing fungal spores)',
    improvement: '85.8% Disease Suppression',
    impactColor: 'text-teal-700 bg-teal-50 border-teal-200'
  }
];

export const CORRELATION_PAIRS: CorrelationPair[] = [
  {
    sensorA: 'Soil Moisture (%)',
    keyA: 'soilMoisture',
    sensorB: 'Water Flow Rate (L/min)',
    keyB: 'waterFlowRate',
    description: 'Response time between YF-S201 drip pulses and rhizosphere moisture absorption'
  },
  {
    sensorA: 'Air Temp (°C)',
    keyA: 'airTemp',
    sensorB: 'Air Humidity (% SHT31)',
    keyB: 'airHumidity',
    description: 'Psychrometric inverse correlation driving canopy Vapor Pressure Deficit (VPD)'
  },
  {
    sensorA: 'Leaf Wetness (%)',
    keyA: 'leafWetness',
    sensorB: 'Disease Risk Score',
    keyB: 'diseaseRiskScore',
    description: 'Foliar free moisture duration triggering fungal spore germination (Turmeric leaf spot)'
  },
  {
    sensorA: 'Soil EC (dS/m)',
    keyA: 'soilEC',
    sensorB: 'NPK Potassium K (mg/kg)',
    keyB: 'npkK',
    description: 'Ion mobility correlation during precision fertigation dosing phases'
  },
  {
    sensorA: 'Solar Radiation (W/m²)',
    keyA: 'solarRadiation',
    sensorB: 'ESP32 Solar Current (mA)',
    keyB: 'solarChargingCurrent',
    description: 'Photovoltaic edge node self-sufficiency under Krishna-Guntur irradiance'
  },
  {
    sensorA: 'Soil Moisture (%)',
    keyA: 'soilMoisture',
    sensorB: 'Soil Temp (°C)',
    keyB: 'soilTemp',
    description: 'Thermal buffering capacity of wet vs dry soil in root rhizosphere'
  }
];
