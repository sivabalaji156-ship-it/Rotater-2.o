import { ClimateStats, Prediction, BoundingBox, Calamity } from "../types";

export interface ResolvedLocation {
  lat: number;
  lon: number;
  bbox: BoundingBox | null;
  resolvedName: string;
}

const callBridge = async (task: string, payload: any) => {
  const res = await fetch("/.netlify/functions/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, payload }),
  });
  if (!res.ok) throw new Error("Bridge connection failed");
  return await res.json();
};

const cleanJSON = (text: string) => {
  if (!text) return "{}";
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text;
};

export const resolveGeospatialQuery = async (query: string): Promise<ResolvedLocation> => {
  const data = await callBridge("geospatial", { query });
  return JSON.parse(cleanJSON(data.text));
};

export const getClimateInsights = async (
  stats: ClimateStats[],
  lat: number,
  lon: number
): Promise<{ summary: string; predictions: Prediction[] }> => {
  try {
    const data = await callBridge("insights", { stats: stats.slice(-24), lat, lon });
    return JSON.parse(cleanJSON(data.text));
  } catch (error) {
    return {
      summary: "Satellite analysis offline. Displaying raw telemetry.",
      predictions: []
    };
  }
};

export const sendChatMessage = async (message: string, context: any): Promise<string> => {
  const systemInstruction = `You are ROTATER AI. Location: ${context.lat}, ${context.lon}. Context: ${JSON.stringify(context.predictions)}`;
  const data = await callBridge("chat", { message, systemInstruction });
  return data.text || "No response from array.";
};