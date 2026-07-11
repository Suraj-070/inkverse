import Groq from "groq-sdk";

export function groq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY! });
}

export const GROQ_MODEL = "llama-3.3-70b-versatile";

export function parseJSON<T>(text: string): T | null {
  try {
    const clean = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(clean) as T;
  } catch {
    return null;
  }
}