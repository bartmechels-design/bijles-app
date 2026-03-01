/**
 * Neural TTS API Route
 *
 * POST /[locale]/api/tutor/tts
 *
 * Converts text to speech using OpenAI TTS API (server-side, key hidden from client).
 * Returns raw MP3 audio bytes.
 *
 * Request body: { text: string, lang: string }
 * Response: audio/mpeg binary stream
 */

import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

// Characters-per-request hard cap (prevents runaway cost from malformed requests)
const MAX_TTS_CHARS = 2000;

// Voice selection by language and quality mode
function getVoice(lang: string, highQuality?: boolean): 'nova' | 'alloy' | 'shimmer' {
  if (lang === 'en-US') return 'alloy';
  // shimmer: clear, soft female — best for slow Dutch dictation (same gender as Koko/nova)
  // nova: warm, female — used for regular conversational TTS
  if (highQuality) return 'shimmer';
  return 'nova';
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> }
) {
  try {
    // Authenticate — TTS costs money, auth is mandatory
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { text, lang, speed, highQuality } = body as { text?: string; lang?: string; speed?: number; highQuality?: boolean };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response('Missing or empty text', { status: 400 });
    }

    if (text.length > MAX_TTS_CHARS) {
      return new Response(`Text exceeds ${MAX_TTS_CHARS} character limit`, { status: 400 });
    }

    if (!lang || typeof lang !== 'string') {
      return new Response('Missing lang', { status: 400 });
    }

    // Call OpenAI TTS
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Clamp speed: dictation can go as low as 0.25 for youngest children (OpenAI minimum is 0.25)
    const ttsSpeed = Math.min(1.0, Math.max(0.25, speed ?? 0.85));

    // Use tts-1-hd only for dictation words (highQuality=true), normal speech uses tts-1 (much faster)
    const model = highQuality ? 'tts-1-hd' : 'tts-1';

    const mp3Response = await openai.audio.speech.create({
      model,
      voice: getVoice(lang, highQuality),
      input: text,
      response_format: 'mp3',
      speed: ttsSpeed,
    });

    // Stream MP3 bytes directly to client
    const audioBuffer = await mp3Response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return new Response('TTS service error', { status: 500 });
  }
}
