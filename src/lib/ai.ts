import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Groq — text generation, always llama-3.3-70b-versatile
export function groq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY! });
}

export const GROQ_MODEL = "llama-3.3-70b-versatile";

// Gemini — vision OCR for handwritten canvas screenshots
export function gemini() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

export const GEMINI_MODEL = "gemini-2.0-flash"; // free tier, vision capable

// Shared JSON parse — strips markdown fences, returns null on failure
export function parseJSON<T>(text: string): T | null {
  try {
    const clean = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(clean) as T;
  } catch {
    return null;
  }
}
