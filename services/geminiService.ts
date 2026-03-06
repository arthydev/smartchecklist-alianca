
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeObservations(observation: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise a seguinte observação de não conformidade de um coletor de dados industrial e sugira uma ação corretiva imediata técnica: "${observation}"`,
      config: {
        systemInstruction: "Você é um técnico especialista em coletores Zebra e sistemas de logística. Responda de forma curta e profissional em Português.",
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Não foi possível gerar sugestão técnica no momento.";
  }
}
