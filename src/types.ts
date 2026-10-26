export type SensorCategory = 'soil' | 'atmosphere' | 'water' | 'hardware' | 'agronomy';
export type SensorStatus = 'optimal' | 'warning' | 'critical';

export interface SensorMetric {
  key: string;
  label: string;
  sensorModel: string;
  category: SensorCategory;
  unit: string;
  current: number;
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  q25: number;
  q75: number;
  idealRange: [number, number];
  status: SensorStatus;
  description: string;
  color: string;
}

export interface TelemetryReading {
  id: string;
  timestamp: string;
  timeLabel: string;
  soilMoisture: number;
  airTemp: number;
  airHumidity: number;
  soilTemp: number;
  soilPH: number;
  soilEC: number;
  npkN: number;
  npkP: number;
  npkK: number;
  waterLevel: number;
  waterTankVolume: number;
  waterFlowRate: number;
  cumulativeWaterFlow: number;
  rainDetected: boolean;
  rainRate: number;
  leafWetness: number;
  waterTDS: number;
  esp32Battery: number;
  esp32Rssi: number;
  esp32CpuTemp: number;
  solarChargingCurrent: number;
  solarRadiation: number;
  vpd: number;
  et0: number;
  diseaseRiskScore: number;
  diseaseRiskStatus: 'Low' | 'Moderate' | 'High' | 'Severe';
  [key: string]: string | number | boolean;
}

export interface ActuatorState {
  mainWaterPump: boolean;
  solenoidZoneA: boolean;
  solenoidZoneB: boolean;
  fertigationPump: boolean;
  buzzerAlarm: boolean;
  autoMode: boolean;
  lastChanged: string;
}

export interface CropStage {
  stage: string;
  period: string;
  parametersMonitored: string[];
  hardwareComponents: string[];
  softwareComponents: string[];
  aiModule: string;
  outputToFarmer: string;
  optimalRanges: {
    soilMoisture: string;
    soilPH: string;
    soilEC: string;
    npk: string;
    temp: string;
    humidity: string;
  };
}

export interface TrialComparison {
  parameter: string;
  zoneAAutomated: string;
  zoneBManual: string;
  improvement: string;
  impactColor: string;
}

export interface CorrelationPair {
  sensorA: string;
  keyA: keyof TelemetryReading;
  sensorB: string;
  keyB: keyof TelemetryReading;
  description: string;
}

export interface HistogramBin {
  binLabel: string;
  min: number;
  max: number;
  count: number;
}
