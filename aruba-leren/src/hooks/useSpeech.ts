'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Text-to-Speech hook — reads text aloud using OpenAI TTS API (server-side).
 *
 * Text is split only on paragraph breaks, not per sentence, for natural prosody.
 * highQuality=true uses tts-1-hd (for dictation words); default uses tts-1 (fast).
 */

/** Fetch one audio chunk from the TTS API. Returns null on any error or abort. */
async function fetchChunk(
  text: string,
  lang: string,
  speed: number,
  signal: AbortSignal,
  highQuality?: boolean
): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch('/nl/api/tutor/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang, speed, highQuality }),
      signal,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`TTS API ${response.status}:`, errText);
      return null;
    }
    return response.arrayBuffer();
  } catch {
    return null; // AbortError and network errors both return null
  }
}

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Pre-fetch cache: starts the HTTP request before speak() is called.
  // Key format: "text::lang::speed::highQuality"
  const prefetchRef = useRef<{ key: string; promise: Promise<ArrayBuffer | null> } | null>(null);

  /** Stop current audio and clean up blob URL. Safe to call multiple times. */
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const speak = useCallback(async (
    text: string,
    lang: string = 'nl-NL',
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      speed?: number;
      highQuality?: boolean;
    }
  ) => {
    // Cancel any previous speak call
    cleanup();
    if (abortRef.current) abortRef.current.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    if (!text.trim()) return;

    try {
      setIsSpeaking(true);
      callbacks?.onStart?.();

      // Collapse ALL line breaks into spaces → one TTS call = no inter-call gap.
      // OpenAI TTS handles up to 4096 chars with natural prosody; no need to split.
      const processed = text.trim()
        .replace(/\n+/g, ' ')
        .replace(/\s{2,}/g, ' ');

      // Only split if text exceeds OpenAI's limit (safety margin below 4096).
      const MAX_CHARS = 3800;
      let chunks: string[];
      if (processed.length <= MAX_CHARS) {
        chunks = [processed];
      } else {
        chunks = [];
        let remaining = processed;
        while (remaining.length > MAX_CHARS) {
          const cutAt = remaining.lastIndexOf('. ', MAX_CHARS);
          const split = cutAt > 0 ? cutAt + 2 : MAX_CHARS;
          chunks.push(remaining.slice(0, split).trim());
          remaining = remaining.slice(split).trim();
        }
        if (remaining) chunks.push(remaining);
      }

      const speed = callbacks?.speed ?? 0.88;
      const highQuality = callbacks?.highQuality ?? false;

      // Use pre-fetched first chunk if available (started during AI streaming)
      const firstKey = `${chunks[0]}::${lang}::${speed}::${String(highQuality)}`;
      let nextFetch: Promise<ArrayBuffer | null>;
      if (prefetchRef.current?.key === firstKey) {
        nextFetch = prefetchRef.current.promise;
        prefetchRef.current = null;
      } else {
        nextFetch = fetchChunk(chunks[0], lang, speed, abort.signal, highQuality);
      }

      for (let i = 0; i < chunks.length; i++) {
        if (abort.signal.aborted) break;

        const buffer = await nextFetch;
        if (abort.signal.aborted) break;
        if (!buffer) {
          // OpenAI TTS API failed (wrong key, 401, 500, network error).
          // Fall back to speechSynthesis — works on Chrome after user gesture,
          // and works on iOS if speechSynthesis was unlocked via the banner tap.
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            await new Promise<void>(resolve => {
              if (abort.signal.aborted) { resolve(); return; }
              const utt = new SpeechSynthesisUtterance(chunks[i]);
              utt.lang = lang;
              utt.rate = speed;
              utt.onend = () => resolve();
              utt.onerror = () => resolve();
              abort.signal.addEventListener('abort', () => { window.speechSynthesis.cancel(); resolve(); }, { once: true });
              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(utt);
            });
          }
          break;
        }

        // While playing the current chunk, pre-fetch the next one (overlap I/O)
        if (i + 1 < chunks.length) {
          nextFetch = fetchChunk(chunks[i + 1], lang, speed, abort.signal, highQuality);
        }

        // Play this chunk
        await new Promise<void>(resolve => {
          if (abort.signal.aborted) { resolve(); return; }

          const blob = new Blob([buffer], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;

          const done = () => {
            URL.revokeObjectURL(url);
            if (blobUrlRef.current === url) blobUrlRef.current = null;
            if (audioRef.current === audio) audioRef.current = null;
            resolve();
          };

          audio.onended = done;
          audio.onerror = done;
          // Resolve immediately if stop() is called mid-playback
          abort.signal.addEventListener('abort', () => { audio.pause(); done(); }, { once: true });
          audio.play().catch(() => {
            // Browser blocked autoplay (no user gesture yet) — fall back to speechSynthesis
            URL.revokeObjectURL(url);
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              const utt = new SpeechSynthesisUtterance(text);
              utt.lang = lang;
              utt.rate = 0.92;
              utt.onend = done;
              utt.onerror = done;
              abort.signal.addEventListener('abort', () => { window.speechSynthesis.cancel(); done(); }, { once: true });
              window.speechSynthesis.speak(utt);
            } else {
              done();
            }
          });
        });
      }

      if (!abort.signal.aborted) {
        setIsSpeaking(false);
        callbacks?.onEnd?.();
      }
    } catch (error) {
      if (!abort.signal.aborted) {
        console.error('TTS playback error:', error);
        setIsSpeaking(false);
        callbacks?.onEnd?.();
      }
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    cleanup();
    setIsSpeaking(false);
  }, [cleanup]);

  /**
   * Start fetching TTS audio in advance, before speak() is called.
   * Called during AI streaming so the first audio chunk is ready immediately
   * when streaming ends and speak() is invoked.
   *
   * speak() will reuse the in-flight request if the text matches exactly.
   */
  const prefetch = useCallback((
    text: string,
    lang: string,
    speed: number = 0.88,     // must match speak() default
    highQuality: boolean = false // must match speak() default so keys align
  ) => {
    if (!text.trim()) return;
    const key = `${text}::${lang}::${speed}::${String(highQuality)}`;
    // Already prefetching this exact text — skip
    if (prefetchRef.current?.key === key) return;
    // Start fetch with its own abort controller (independent of speak lifecycle)
    prefetchRef.current = {
      key,
      promise: fetchChunk(text, lang, speed, new AbortController().signal, highQuality),
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      cleanup();
    };
  }, [cleanup]);

  return { speak, stop, prefetch, isSpeaking };
}

/**
 * Speech-to-Text hook — converts voice input to text using browser SpeechRecognition API.
 */
export function useSpeechToText(lang: string = 'nl-NL') {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionCtor);

    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        setTranscript(result[0].transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, [lang]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return { startListening, stopListening, isListening, transcript, isSupported };
}
