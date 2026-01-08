
export interface BoundingBox {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

export interface ClimateStats {
  date: string;
  temperature: number; // Celsius
  rainfall: number; // mm
  ndvi: number; // 0-1
  anomaly: number;
}

export interface LocationData {
  lat: number;
  lon: number;
  name?: string;
  bbox?: BoundingBox;
}

export interface Prediction {
  month: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  predictedTemp: number;
  description: string;
}

export interface Calamity {
  year: number;
  type: 'Flood' | 'Drought' | 'Cyclone' | 'Heatwave';
  intensity: string;
  month: string;
}

export interface ViewState {
  view: 'intro' | 'dashboard';
}

export enum ClimateModel {
  ARIMA = 'ARIMA',
  PROPHET = 'Prophet',
  LSTM = 'LSTM'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface NewsResult {
  summary: string;
  sources: GroundingSource[];
}

export interface MapResult {
  answer: string;
  points: GroundingSource[];
}
