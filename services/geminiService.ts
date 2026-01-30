import { GoogleGenAI, Type, FunctionDeclaration, Modality } from "@google/genai";

// We use process.env.API_KEY as per instructions.
// For features requiring user-selected key (Veo/High-Quality Image), the key is injected.
// However, creating a new instance ensures we pick up the latest key if it changed.

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to handle API Key selection if 404/Not Found occurs
const runWithRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found") || error.status === 404) {
      console.warn("Entity not found, triggering key selection...");
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        try {
          await aistudio.openSelectKey();
          // Retry the operation once with the new key context.
          // We assume process.env.API_KEY or the internal auth context is updated.
          return await operation();
        } catch (selectionError) {
          console.error("Key selection failed or cancelled", selectionError);
          // Throw the original error if selection failed so the UI can show the alert
          throw error;
        }
      }
    }
    throw error;
  }
};

export const chatWithGemini = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[]
) => {
  return runWithRetry(async () => {
    const ai = getAI();
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history,
      config: {
        systemInstruction: "You are an expert Real Estate Investment Analyst. Provide concise, data-driven advice.",
      }
    });

    const response = await chat.sendMessage({ message });
    return response.text || "";
  });
};

export const analyzeImage = async (base64Image: string, prompt: string) => {
  return runWithRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      }
    });
    return response.text || "";
  });
};

export const generateImage = async (prompt: string, aspectRatio: string, size: string) => {
  return runWithRetry(async () => {
    const ai = getAI();
    // using gemini-3-pro-image-preview as requested for generation
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any, // "1:1" | "16:9" etc
          imageSize: size as any // "1K" | "2K" | "4K"
        }
      }
    });
    
    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  });
};

export const editImage = async (base64Image: string, prompt: string) => {
  return runWithRetry(async () => {
    const ai = getAI();
    // using gemini-2.5-flash-image for editing
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: prompt }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image generated");
  });
};

export const searchMarketData = async (query: string) => {
  return runWithRetry(async () => {
    const ai = getAI();
    // Using gemini-3-flash-preview with googleSearch for up-to-date info
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    return {
      text: response.text || "",
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  });
};

export const fetchMarketTrends = async (location: string, propertyType: string) => {
  return runWithRetry(async () => {
    const ai = getAI();
    const prompt = `Research current real estate market trends for ${propertyType} in ${location}. 
    Provide a concise summary including:
    1. Average Sale Price
    2. Average Monthly Rent
    3. Approximate Rental Yield / Cap Rate
    4. Recent Market Trend (e.g. prices up/down)
    
    Present the data clearly to help a developer estimate ROI.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    return {
      text: response.text || "",
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  });
};

export const findNearbyPlaces = async (query: string, lat: number, lng: number) => {
  return runWithRetry(async () => {
    const ai = getAI();
    // Using gemini-2.5-flash with googleMaps
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      }
    });

    return {
      text: response.text || "",
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  });
};

export const quickAnalysis = async (prompt: string) => {
    return runWithRetry(async () => {
      const ai = getAI();
      // Using gemini-flash-lite-latest for fast, simple responses
      const response = await ai.models.generateContent({
          model: 'gemini-flash-lite-latest',
          contents: prompt
      });
      return response.text || "";
    });
}

export const estimateProjectDetails = async (description: string) => {
  return runWithRetry(async () => {
    const ai = getAI();
    const prompt = `
      Estimate the financial parameters for a real estate development project described as: "${description}".
      
      Return a valid JSON object matching this structure with realistic market values:
      {
        "totalSqFt": number,
        "landCosts": { "purchasePrice": number, "taxes": number, "permits": number },
        "constructionCosts": { "materials": number, "labor": number, "contractorFees": number, "contingency": number },
        "financing": { "loanAmount": number, "interestRate": number, "loanTermYears": number },
        "revenue": { "estimatedResaleValue": number, "rentalIncomeMonthly": number, "appreciationRate": number },
        "operatingExpenses": { "propertyTaxesYearly": number, "insuranceYearly": number, "maintenanceYearly": number, "vacancyRate": number }
      }
      
      IMPORTANT: Return ONLY the JSON object. No markdown code blocks, no explanation.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    
    const text = response.text || "{}";
    // Clean potential markdown wrappers if the model returns them despite responseMimeType
    const jsonString = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonString);
  });
}