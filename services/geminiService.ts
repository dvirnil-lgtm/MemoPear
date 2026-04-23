
import { GoogleGenAI, Type } from "@google/genai";
import { Lead, ScannedLeadData } from "../types";

/**
 * Uses Gemini to parse raw text (often vCard or unstructured) from a conference badge QR code.
 */
export const parseScannedData = async (rawText: string): Promise<ScannedLeadData> => {
  // Creating a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract lead information from the following raw QR code scan text: "${rawText}". If it looks like a vCard, parse it correctly.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstName: { type: Type.STRING },
            lastName: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            linkedin: { type: Type.STRING },
            company: { type: Type.STRING },
            jobTitle: { type: Type.STRING },
            website: { type: Type.STRING },
          },
        },
      },
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Error parsing scanned data:", error);
    return {};
  }
};

/**
 * Uses Gemini Vision to extract contact details from an image of a business card.
 */
export const parseBusinessCard = async (base64Image: string): Promise<ScannedLeadData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const mimeTypeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = base64Image.split(',')[1] || base64Image;

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          imagePart,
          { text: "Act as a high-precision OCR and contact extraction engine. Extract all contact information from this business card image. Return ONLY a valid JSON object with these keys: firstName, lastName, email, phone, company, jobTitle, website, linkedin. If a field is not found, use an empty string. Ensure the JSON is valid." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstName: { type: Type.STRING },
            lastName: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            linkedin: { type: Type.STRING },
            company: { type: Type.STRING },
            jobTitle: { type: Type.STRING },
            website: { type: Type.STRING },
          },
        },
      },
    });

    const text = response.text.trim();
    // Remove potential markdown code blocks if the model ignored responseMimeType
    const jsonStr = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error parsing business card:", error);
    return {};
  }
};

/**
 * Generates a professional summary and follow-up email draft for the agent.
 */
export const generateLeadReport = async (lead: Lead): Promise<string> => {
  // Creating a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a professional lead summary and a follow-up email draft for this person met at a conference.
      Lead Name: ${lead.firstName} ${lead.lastName}
      Company: ${lead.company || 'Unknown'}
      Email: ${lead.email || 'Not provided'}
      Phone: ${lead.phone || 'Not provided'}
      Preferred Contact Methods: ${lead.commMethods.join(', ')}
      Notes from meeting: ${lead.notes}
      
      The output should be a concise summary followed by a polite follow-up email ready to be sent. Use the company name and contact details to personalize the draft.`,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "Summary generation failed.";
  } catch (error) {
    console.error("Error generating lead report:", error);
    return "Could not generate AI summary.";
  }
};