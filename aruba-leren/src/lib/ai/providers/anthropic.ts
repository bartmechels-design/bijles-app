import { createAnthropic } from '@ai-sdk/anthropic';

// Create Anthropic provider with API key from environment
// IMPORTANT: Only used in server-side code (API routes, server actions)
export const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Primary model for tutoring — Sonnet 4.5 (cost-effective for elementary education)
// Pricing: $3/MTok input, $15/MTok output (Feb 2026)
export const TUTOR_MODEL = anthropicProvider('claude-sonnet-4-5-20250514');

// Cost control constants
export const MAX_TOKENS_PER_RESPONSE = 1024;
export const DAILY_TOKEN_LIMIT = 50_000;  // Per child, per day
export const TEMPERATURE = 0.7;           // Slight creativity for kid-friendly responses
export const MAX_CONTEXT_MESSAGES = 15;   // Keep last 15 messages in context
