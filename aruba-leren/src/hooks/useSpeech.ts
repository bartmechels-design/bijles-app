'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Text-to-Speech hook — reads text aloud using OpenAI TTS API (server-side).
 * Drop-in replacement for the old useTextToSpeech() that used window.speechSynthesis.
 *
 * Interface identical to old hook: speak(text, lang, { onStart, onEnd }), stop(), isSpeaking
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

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

    if (!text.trim()) return;

    try {
      setIsSpeaking(true);
      callbacks?.onStart?.();

      // Fetch MP3 from server-side TTS route
      // URL uses relative path — works regardless of locale in URL
      const response = await fetch('/nl/api/tutor/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      });

      if (!response.ok) {
        console.error('TTS API error:', response.status);
        setIsSpeaking(false);
        callbacks?.onEnd?.();
        return;
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;

      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        callbacks?.onEnd?.();
        URL.revokeObjectURL(blobUrl);
        blobUrlRef.current = null;
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        callbacks?.onEnd?.();
        URL.revokeObjectURL(blobUrl);
        blobUrlRef.current = null;
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error('TTS playback error:', error);
      setIsSpeaking(false);
      callbacks?.onEnd?.();
    }
  }, []);

  const stop = useCallback(() => {
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
