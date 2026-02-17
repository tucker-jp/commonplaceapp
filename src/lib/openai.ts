import OpenAI from "openai";

// Lazy initialization to avoid build-time errors
let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

// For backwards compatibility - will throw if API key not set
export const openai = {
  get chat() {
    return getOpenAI().chat;
  },
  get audio() {
    return getOpenAI().audio;
  },
};

// Model configurations
export const MODELS = {
  CATEGORIZATION: "gpt-4.1-nano",
  ANALYSIS: "gpt-4.1-nano",
  TRANSCRIPTION: "whisper-1",
} as const;

export const TEMPERATURES = {
  CATEGORIZATION: 0.1,
  ANALYSIS: 0.1,
} as const;
