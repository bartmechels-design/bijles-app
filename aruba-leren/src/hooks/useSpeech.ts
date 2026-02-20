'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Score a voice for quality. Higher = better.
 * Prioritizes Microsoft Natural/Neural voices on Windows 11.
 */
function scoreVoice(v: SpeechSynthesisVoice, lang: string): number {
  let score = 0;
  const name = v.name.toLowerCase();

  // Exact language match is essential
  if (v.lang === lang) score += 100;
  else if (v.lang.startsWith(lang.split('-')[0])) score += 50;
  else return 0; // wrong language

  // "Natural" voices (Windows 11) sound much more human
  if (name.includes('natural')) score += 40;
  // "Neural" / "Online" voices are also high quality
  if (name.includes('neural') || name.includes('online')) score += 30;
  // Non-local (cloud/network) voices are usually better
  if (!v.localService) score += 10;
  // Google voices are decent
  if (name.includes('google')) score += 15;

  return score;
}

/**
 * Find the best available voice for a given language.
 * Prioritizes natural/neural voices for the most human-like sound.
 */
function findBestVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  let bestVoice: SpeechSynthesisVoice | null = null;
  let bestScore = 0;

  for (const v of voices) {
    const s = scoreVoice(v, lang);
    if (s > bestScore) {
      bestScore = s;
      bestVoice = v;
    }
  }

  return bestVoice;
}

/**
 * Text-to-Speech hook — reads text aloud using browser Speech Synthesis API.
 * Automatically selects the best available voice for the language.
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Voices load asynchronously in some browsers
  useEffect(() => {
    const loadVoices = () => {
      if (window.speechSynthesis.getVoices().length > 0) {
        setVoicesLoaded(true);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  const speak = useCallback((text: string, lang: string = 'nl-NL', callbacks?: {
    onStart?: () => void
    onEnd?: () => void
  }) => {
    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.92; // Slightly slow for children, but natural enough for intonation
    utterance.pitch = 1.1; // Slightly higher for friendly Koko voice

    // Try to find the best voice for this language
    const voice = findBestVoice(lang);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      callbacks?.onStart?.();
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      callbacks?.onEnd?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      callbacks?.onEnd?.();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voicesLoaded]); // Re-create when voices load

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return { speak, stop, isSpeaking };
}

/**
 * Speech-to-Text hook — converts voice input to text using browser SpeechRecognition API
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
