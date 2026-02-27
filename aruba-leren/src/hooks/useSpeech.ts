'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { splitIntoSegments } from '@/lib/ai/tts-utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Text-to-Speech hook — reads text aloud using OpenAI TTS API (server-side).
 * Drop-in replacement for the old useTextToSpeech() that used window.speechSynthesis.
 *
 * Interface identical to old hook: speak(text, lang, { onStart, onEnd }), stop(), isSpeaking
 *
 * Text is split into segments (sentence/clause boundaries) and played sequentially
 * with appropriate pauses (600ms after . ! ?, 300ms after , ; :) for natural prosody.
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const isCancelledRef = useRef(false);

  const speak = useCallback(async (
    text: string,
    lang: string = 'nl-NL',
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
    }
  ) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    // Reset cancellation flag for this new speak call
    isCancelledRef.current = false;

    if (!text.trim()) return;

    // Split into segments with pause timings
    const segments = splitIntoSegments(text);
    if (segments.length === 0) return;

    try {
      setIsSpeaking(true);
      callbacks?.onStart?.();

      // Play segments sequentially with pauses between them
      for (let i = 0; i < segments.length; i++) {
        if (isCancelledRef.current) break;

        const segment = segments[i];

        // Fetch MP3 for this segment
        const response = await fetch('/nl/api/tutor/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: segment.text, lang }),
        });

        if (!response.ok) {
          console.error('TTS segment error:', response.status, 'for segment:', segment.text);
          continue; // Skip failed segment, continue with next
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;

        // Play this segment and wait for it to finish
        await new Promise<void>((resolve, reject) => {
          const audio = new Audio(blobUrl);
          audioRef.current = audio;

          audio.onended = () => {
            URL.revokeObjectURL(blobUrl);
            blobUrlRef.current = null;
            audioRef.current = null;
            resolve();
          };

          audio.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            blobUrlRef.current = null;
            audioRef.current = null;
            reject(new Error('Audio playback error'));
          };

          audio.play().catch(reject);
        });

        // Pause between segments (not after the last one)
        if (segment.pauseAfter > 0) {
          await new Promise<void>(resolve => setTimeout(resolve, segment.pauseAfter));
        }

        if (isCancelledRef.current) break;
      }

      setIsSpeaking(false);
      callbacks?.onEnd?.();
    } catch (error) {
      console.error('TTS playback error:', error);
      setIsSpeaking(false);
      callbacks?.onEnd?.();
    }
  }, []);

  const stop = useCallback(() => {
    isCancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  return { speak, stop, isSpeaking };
}

/**
 * Speech-to-Text hook — converts voice input to text using browser SpeechRecognition API.
 * Unchanged from Phase 9.
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
