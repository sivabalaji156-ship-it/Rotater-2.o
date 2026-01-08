
import { GoogleGenAI, Type, Chat, Modality } from "@google/genai";
import { ClimateStats, Prediction, NewsResult, MapResult, GroundingSource, BoundingBox, Calamity } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ResolvedLocation {
  lat: number;
  lon: number;
  bbox: BoundingBox | null;
  resolvedName: string;
}

// Helper to clean Markdown JSON blocks often returned by LLMs
const cleanJSON = (text: string) => {
  if (!text) return "{}";
  // Attempt to extract JSON object structure directly
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.substring(firstBrace, lastBrace + 1);
  }
  
  return text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
};

export const resolveGeospatialQuery = async (query: string): Promise<ResolvedLocation> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Resolve the following location query into geographic coordinates: "${query}". 
      If it is a city, town, or region, provide a bounding box that covers the area. 
      If it is a specific building or point, return null for the bounding box.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER, description: "Center latitude" },
            lon: { type: Type.NUMBER, description: "Center longitude" },
            resolvedName: { type: Type.STRING, description: "Official name of the place" },
            bbox: {
              type: Type.OBJECT,
              properties: {
                latMin: { type: Type.NUMBER },
                latMax: { type: Type.NUMBER },
                lonMin: { type: Type.NUMBER },
                lonMax: { type: Type.NUMBER }
              },
              nullable: true
            }
          },
          required: ["lat", "lon", "resolvedName"]
        }
      }
    });

    const cleanText = cleanJSON(response.text || "{}");
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Geospatial Resolution Error:", error);
    throw new Error("Failed to resolve location coordinates.");
  }
};

export const getClimateInsights = async (
  stats: ClimateStats[],
  lat: number,
  lon: number
): Promise<{ summary: string; predictions: Prediction[] }> => {
  try {
    const recentStats = stats.slice(-24);
    const prompt = `
      Analyze the following climate data for location (${lat}, ${lon}).
      Data (Last 24 months): ${JSON.stringify(recentStats)}
      
      Task:
      1. Provide a concise summary of recent trends.
      2. Predict potential risks for the next 12 months.
      3. Identify signs of drought or flood risks.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  month: { type: Type.STRING },
                  riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
                  predictedTemp: { type: Type.NUMBER },
                  description: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const cleanText = cleanJSON(response.text || "{}");
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return {
      summary: "AI Analysis unavailable. Displaying raw data only.",
      predictions: [
        { month: "Next Month", riskLevel: "Medium", predictedTemp: 0, description: "Prediction unavailable" }
      ]
    };
  }
};

export const getLocalNews = async (lat: number, lon: number): Promise<NewsResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find recent (last 6 months) climate news near ${lat}, ${lon}.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const sources: GroundingSource[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      }
    });

    return { summary: response.text || "No recent news found.", sources };
  } catch (e) {
    return { summary: "Could not fetch news.", sources: [] };
  }
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this climate report clearly and professionally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS Error:", error);
    return undefined;
  }
};

export const getNearbyResources = async (lat: number, lon: number): Promise<MapResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "List nearby emergency shelters, hospitals, and disaster relief centers.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: { latLng: { latitude: lat, longitude: lon } }
        }
      }
    });

    const points: GroundingSource[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
      if (chunk.maps) {
        points.push({ title: chunk.maps.title, uri: chunk.maps.uri });
      } else if (chunk.web) {
        points.push({ title: chunk.web.title, uri: chunk.web.uri });
      }
    });

    return { answer: response.text || "No resources found.", points };
  } catch (e) {
    return { answer: "Could not fetch resources.", points: [] };
  }
};

export const createChatSession = (context: {
  lat: number,
  lon: number,
  predictions: Prediction[],
  calamities: Calamity[]
}): Chat => {
  const systemInstruction = `
    You are ROTATER's advanced climate AI assistant. 
    CURRENT CONTEXT:
    - Location: Lat ${context.lat}, Lon ${context.lon}
    - Major Historical Events: ${JSON.stringify(context.calamities.filter(c => c.intensity === 'Severe'))}
    - AI Projected Risks: ${JSON.stringify(context.predictions.filter(p => p.riskLevel === 'High' || p.riskLevel === 'Critical'))}
    
    Interpret the data on the dashboard for the user. When users ask for "alerts" or "major events", 
    refer to the historical and projected data provided in your context.
    Be scientific, professional, and helpful.
  `;

  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: { systemInstruction }
  });
};