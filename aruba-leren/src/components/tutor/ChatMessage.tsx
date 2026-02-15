'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTextToSpeech } from '@/hooks/useSpeech';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  locale?: string;
  imageUrl?: string;
}

function getLang(locale?: string) {
  if (locale === 'pap') return 'nl-NL'; // Papiamento fallback to Dutch
  if (locale === 'es') return 'es-ES';
  if (locale === 'en') return 'en-US';
  return 'nl-NL';
}

/** Strip markdown formatting and special characters so TTS reads clean text */
function cleanForSpeech(text: string): string {
  return text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')   // **bold**, *italic*, ***both***
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')       // __bold__, _italic_
    .replace(/~~([^~]+)~~/g, '$1')                // ~~strikethrough~~
    .replace(/`([^`]+)`/g, '$1')                  // `code`
    .replace(/^#{1,6}\s+/gm, '')                  // # headings
    .replace(/^[-*+]\s+/gm, '')                   // - bullet points
    .replace(/^\d+\.\s+/gm, '')                   // 1. numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')      // [links](url)
    .replace(/[*_~`^#>|]/g, '')                    // remaining special chars
    .replace(/\n{2,}/g, '. ')                      // double newlines → pause
    .replace(/\s{2,}/g, ' ')                       // collapse whitespace
    .trim();
}

/** Regex to find [SPREEK]...[/SPREEK] blocks in Koko's messages */
const SPREEK_REGEX = /\[SPREEK\]([\s\S]*?)\[\/SPREEK\]/g;

/**
 * Parse message content into segments:
 * - text segments (visible)
 * - spoken segments (hidden, played via TTS)
 */
interface TextSegment { type: 'text'; content: string }
interface SpokenSegment { type: 'spoken'; content: string; index: number }
type Segment = TextSegment | SpokenSegment;

function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let spokenIndex = 0;
  let match;

  // Reset regex state
  SPREEK_REGEX.lastIndex = 0;

  while ((match = SPREEK_REGEX.exec(content)) !== null) {
    // Text before this spoken block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text.trim()) segments.push({ type: 'text', content: text });
    }
    // The spoken block itself
    segments.push({ type: 'spoken', content: match[1].trim(), index: spokenIndex++ });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last spoken block
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text.trim()) segments.push({ type: 'text', content: text });
  }

  return segments;
}

/** Check if content contains any [SPREEK] blocks */
function hasSpeekBlocks(content: string): boolean {
  SPREEK_REGEX.lastIndex = 0;
  return SPREEK_REGEX.test(content);
}

/**
 * Inline play button for a spoken segment (dictation / read-aloud).
 * Shows a speaker icon; plays the hidden text via TTS on click.
 * NOTE: [SPREEK] content is always school content (Dutch), so we always use nl-NL for TTS.
 */
function SpokenBlock({ text, autoPlay }: { text: string; locale?: string; autoPlay?: boolean }) {
  const { speak, stop, isSpeaking } = useTextToSpeech();
  const [played, setPlayed] = useState(false);
  const autoPlayedRef = useRef(false);

  const handlePlay = useCallback(() => {
    if (isSpeaking) {
      stop();
    } else {
      // Always Dutch for school content (dictation words, reading texts)
      speak(cleanForSpeech(text), 'nl-NL');
      setPlayed(true);
    }
  }, [isSpeaking, speak, stop, text]);

  // Auto-play on mount for dictation (only once)
  useEffect(() => {
    if (autoPlay && !autoPlayedRef.current) {
      autoPlayedRef.current = true;
      // Small delay so the message renders first
      const timer = setTimeout(() => {
        speak(cleanForSpeech(text), 'nl-NL');
        setPlayed(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, speak, text]);

  return (
    <span className="inline-flex items-center gap-1.5 my-1">
      <button
        onClick={handlePlay}
        className={`inline-flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-full transition-all ${
          isSpeaking
            ? 'bg-sky-500 text-white animate-pulse'
            : played
              ? 'bg-sky-200 text-sky-700 hover:bg-sky-300'
              : 'bg-amber-400 text-white hover:bg-amber-500 shadow-md'
        }`}
      >
        {isSpeaking ? (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            <span className="text-sm">Stop</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
            <span className="text-sm">{played ? 'Nog een keer' : 'Luister'}</span>
          </>
        )}
      </button>
    </span>
  );
}

export default function ChatMessage({ role, content, isStreaming = false, locale, imageUrl }: ChatMessageProps) {
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const { speak, stop, isSpeaking } = useTextToSpeech();

  useEffect(() => {
    setShouldAnimate(true);
    const timer = setTimeout(() => setShouldAnimate(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
    } else {
      // For full message read-aloud, strip [SPREEK] tags and read everything
      const fullText = content.replace(/\[SPREEK\]|\[\/SPREEK\]/g, '');
      speak(cleanForSpeech(fullText), getLang(locale));
    }
  };

  const containsSpeek = !isStreaming && hasSpeekBlocks(content);

  if (role === 'assistant') {
    return (
      <div
        className={`flex items-start gap-3 ${shouldAnimate ? 'animate-fade-in' : ''}`}
      >
        <div className="bg-sky-100 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🐵</span>
        </div>
        <div className="bg-sky-100 text-sky-900 rounded-2xl rounded-tl-sm px-5 py-3 max-w-[80%] shadow-sm">
          {/* Render with or without spoken blocks */}
          {containsSpeek ? (
            <div className="text-lg">
              {parseSegments(content).map((segment, i) =>
                segment.type === 'text' ? (
                  <span key={i} className="whitespace-pre-wrap">{segment.content}</span>
                ) : (
                  <SpokenBlock
                    key={`spoken-${segment.index}`}
                    text={segment.content}
                    locale={locale}
                    autoPlay={segment.index === 0}
                  />
                )
              )}
            </div>
          ) : (
            <p className="text-lg whitespace-pre-wrap">
              {content}
              {isStreaming && (
                <span className="inline-block w-2 h-5 bg-sky-600 ml-1 animate-pulse"></span>
              )}
            </p>
          )}
          {/* Speak button — only show when not streaming and content exists */}
          {!isStreaming && content && (
            <button
              onClick={handleSpeak}
              className={`mt-2 inline-flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-lg transition-all ${
                isSpeaking
                  ? 'bg-sky-500 text-white'
                  : 'text-sky-600 hover:bg-sky-200'
              }`}
              aria-label={isSpeaking ? 'Stop voorlezen' : 'Voorlezen'}
            >
              {isSpeaking ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              )}
              <span>{isSpeaking ? 'Stop' : 'Lees voor'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 justify-end ${shouldAnimate ? 'animate-fade-in' : ''}`}
    >
      <div className="bg-amber-500 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%] shadow-sm">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Huiswerk"
            className="rounded-lg mb-2 max-w-full max-h-64 object-contain border-2 border-amber-300"
          />
        )}
        <p className="text-lg whitespace-pre-wrap">
          {content}
        </p>
      </div>
    </div>
  );
}
