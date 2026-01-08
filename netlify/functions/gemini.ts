import { GoogleGenAI, Type, Modality } from "@google/genai";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { task, payload } = await req.json();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

    if (task === "geospatial") {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Resolve the following location query into geographic coordinates: "${payload.query}". 
        If it is a city, town, or region, provide a bounding box.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lon: { type: Type.NUMBER },
              resolvedName: { type: Type.STRING },
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
      return new Response(JSON.stringify({ text: response.text }), { status: 200 });
    }

    if (task === "insights") {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze climate data for (${payload.lat}, ${payload.lon}): ${JSON.stringify(payload.stats)}`,
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
                    riskLevel: { type: Type.STRING },
                    predictedTemp: { type: Type.NUMBER },
                    description: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });
      return new Response(JSON.stringify({ text: response.text }), { status: 200 });
    }

    if (task === "chat") {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: payload.message,
        config: {
          systemInstruction: payload.systemInstruction
        }
      });
      return new Response(JSON.stringify({ text: response.text }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Unknown task" }), { status: 400 });

  } catch (err: any) {
    console.error("Gemini Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};