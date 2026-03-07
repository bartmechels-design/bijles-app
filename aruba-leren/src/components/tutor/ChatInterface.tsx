'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Subject } from '@/types/tutoring';
import ChatMessage from './ChatMessage';
import { hasBordBlocks, extractBordContent, hasZinsontledingBlocks, extractZinsontledingContent } from './ChatMessage';
import ZinsontledingPanel from './ZinsontledingPanel';
import type { ZinsontledingData } from './ZinsontledingPanel';
import SessionTimer from './SessionTimer';
import PhoneUploadModal from './PhoneUploadModal';
import WhiteboardPanel from './WhiteboardPanel';
import KokoAvatar from './KokoAvatar';
import VoiceWaveform from './VoiceWaveform';
import HiatenSelector from './HiatenSelector';
import WerkbladPrint from './WerkbladPrint';
import { useSpeechToText, useTextToSpeech } from '@/hooks/useSpeech';
import { useKokoState } from '@/hooks/useKokoState';
import { useVoiceFirstMode } from '@/hooks/useVoiceFirstMode';
import { HIAAT_TOPICS } from '@/lib/ai/prompts/hiaten-prompts';
import { cleanForTts } from '@/lib/ai/tts-utils';

// Message type — supports text and optional image
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string; // base64 data URL for uploaded images
}

interface ChatInterfaceProps {
  childId: string;
  childAge: number;
  childName: string;
  subject: Subject;
  locale: string;
  existingSessionId: string | null;
  subjectLabel: string;
  /** When 'assessment', shows the beginsituatietoets banner and completion UI */
  sessionType?: 'assessment' | 'tutoring';
  /** Pre-selected hiaat topic id from ?hiaat= URL param */
  initialHiaat?: string;
}

function getSttLang(locale: string) {
  if (locale === 'pap') return 'nl-NL';
  if (locale === 'es') return 'es-ES';
  if (locale === 'en') return 'en-US';
  return 'nl-NL';
}

function getTtsLang(locale: string) {
  // Koko's uitleg wordt voorgelezen in de instructietaal.
  // [SPREEK] dictee-woorden gebruiken altijd nl-NL (geregeld in SpokenBlock).
  if (locale === 'es') return 'es-ES';
  if (locale === 'en') return 'en-US';
  return 'nl-NL'; // nl en pap → Dutch TTS
}

function hasSpeekBlocks(text: string) {
  return /\[SPREEK\]/.test(text);
}

// Max file size: 4MB (Claude vision limit is ~5MB)
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

// Regex for the assessment completion signal emitted by Koko
const ASSESSMENT_DONE_REGEX = /\[ASSESSMENT_DONE:level=([1-5])\]/;

/** Strip [ASSESSMENT_DONE:level=X] from visible message text */
function stripAssessmentSignal(text: string): string {
  return text.replace(ASSESSMENT_DONE_REGEX, '').trim();
}

export default function ChatInterface({
  childId,
  childAge,
  childName,
  subject,
  locale,
  existingSessionId,
  subjectLabel,
  sessionType = 'tutoring',
  initialHiaat,
}: ChatInterfaceProps) {
  const t = useTranslations('tutor');
  const router = useRouter();
  const isAssessmentMode = sessionType === 'assessment';
  // Instructietaal: can be switched mid-session without page reload.
  // Persisted in localStorage so it survives page refresh (URL stays at old locale).
  const [tutoringLocale, setTutoringLocale] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`tutorLocale_${childId}`) ?? locale;
    }
    return locale;
  });
  const [currentSessionId, setCurrentSessionId] = useState(existingSessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [hiatenTopicId, setHiatenTopicId] = useState<string | null>(initialHiaat || null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [huiswerkMode, setHuiswerkMode] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [showPhoneUpload, setShowPhoneUpload] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [boardContent, setBoardContent] = useState<string | undefined>(undefined);
  const [showZinsontleding, setShowZinsontleding] = useState(false);
  const [zinsontledingData, setZinsontledingData] = useState<ZinsontledingData | null>(null);
  // Tracks which assistant message's dictation block may auto-play.
  // Set AFTER the explanation TTS finishes, so dictation plays sequentially.
  const [dictationReadyId, setDictationReadyId] = useState<string | null>(null);
  // Audio unlock: browsers block autoplay until first user gesture.
  // Once unlocked, all subsequent speak() calls work automatically.
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const pendingSpeakRef = useRef<{ text: string; lang: string } | null>(null);
  // Pre-fetched audio buffer for iOS gesture unlock (audio.play() must be synchronous).
  // Fetched eagerly when a message arrives while audio is still locked.
  const resolvedBufferRef = useRef<{ buffer: ArrayBuffer; lang: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tracks a sentence pre-fetched during streaming so autoSpeak can play it instantly
  const streamingPrefetchRef = useRef<string | null>(null);
  // Fresh message/loading refs for locale-switch effect (avoids stale closure)
  const messagesRef = useRef(messages);
  const isLoadingRef = useRef(false);
  // AbortController for in-flight locale-switch requests
  const localeSwitchAbortRef = useRef<AbortController | null>(null);
  // Previous locale — used to detect mid-session locale changes (skip initial mount)
  const prevLocaleRef = useRef(locale);
  // After a locale switch, the next N child messages also skip DB history (avoids language bleed-through)
  const noHistoryCountRef = useRef(0);
  // Tracks whether the greeting has been auto-spoken (prevent double-play on re-render)
  const greetingSpokenRef = useRef(false);

  // Speech hooks — use tutoringLocale so they update when language is switched mid-session
  const { startListening, stopListening, isListening, transcript, isSupported: sttSupported } =
    useSpeechToText(getSttLang(tutoringLocale));
  const { speak, stop: stopSpeaking, prefetch: prefetchTts, isSpeaking } = useTextToSpeech();

  // Koko avatar state
  const { emotion, deriveEmotion, setEmotion } = useKokoState();

  // Voice-first mode — disabled for tekst (reading comprehension requires reading, not listening)
  const { isVoiceFirst: isVoiceFirstRaw, setVoiceFirst } = useVoiceFirstMode();
  const isVoiceFirst = subject === 'tekst' ? false : isVoiceFirstRaw;

  // Keep refs in sync with latest state (for use in effects with limited deps)
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  // Persist chosen locale to localStorage (survives page refresh)
  // Also sync top nav LanguageSwitcher on first mount if saved locale differs from URL locale
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`tutorLocale_${childId}`, tutoringLocale);
    // Sync top nav on first mount when saved locale differs from URL locale
    if (tutoringLocale !== locale) {
      window.dispatchEvent(new CustomEvent('tutoringLocaleChange', { detail: tutoringLocale }));
    }
  }, [tutoringLocale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track last completed assistant message for auto-TTS
  const lastCompletedRef = useRef<string | null>(null);

  // Derive Koko emotion from current state
  useEffect(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    deriveEmotion({
      isLoading,
      isListening,
      isSpeaking,
      lastAssistantMessage: lastAssistant?.content,
    });
  }, [isLoading, isListening, isSpeaking, messages, deriveEmotion]);

  // When transcript changes, update input field
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Initialize with greeting if no existing session
  useEffect(() => {
    if (!existingSessionId) {
      setMessages([{
        id: 'koko-greeting',
        role: 'assistant',
        content: t('kokoGreeting', { childName, subject: subjectLabel }),
      }]);
    }
  }, [existingSessionId, childName, subjectLabel, t]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // Auto-send first message when huiswerk mode activates with a pending image
  useEffect(() => {
    if (huiswerkMode && pendingImage && !sessionStarted && !isLoading) {
      const timer = setTimeout(() => {
        handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [huiswerkMode, pendingImage]); // eslint-disable-line react-hooks/exhaustive-deps

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Alleen afbeeldingen zijn toegestaan (foto, screenshot)');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('Afbeelding is te groot (max 4MB). Probeer een kleinere foto.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
      setError(null);
      // Activate huiswerk mode when image attached before session starts
      if (!sessionStarted && messages.length <= 1) {
        setHuiswerkMode(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    e.target.value = '';
  };

  // Handle paste from clipboard (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processImageFile(file);
        return;
      }
    }
  };

  // Auto-TTS: speak completed assistant messages in voice-first mode.
  //
  // Flow:
  //   1. Speak the explanation (non-[SPREEK] text) in the locale voice (instructietaal).
  //   2. When explanation finishes → mark this message's dictation block as ready.
  //   3. SpokenBlock sees allowDictationAutoPlay=true and plays the word in nl-NL.
  //
  // If the message has no explanation (only [SPREEK]), dictation plays immediately.
  // If voice-first is off, nothing auto-plays (student uses the Luister button).
  const autoSpeak = useCallback((messageId: string, text: string) => {
    if (!isVoiceFirst) return;

    // Papiamento has no native TTS voice — show text only, dictation blocks still work
    if (tutoringLocale === 'pap') {
      if (hasSpeekBlocks(text)) setDictationReadyId(messageId);
      return;
    }

    const hasSpreek = hasSpeekBlocks(text);
    const cleaned = cleanForTts(text, tutoringLocale);

    if (!cleaned) {
      if (hasSpreek) setDictationReadyId(messageId);
      return;
    }

    const lang = getTtsLang(tutoringLocale);

    streamingPrefetchRef.current = null;

    const onDone = () => {
      setEmotion('idle');
      if (hasSpreek) setDictationReadyId(messageId);
    };

    speak(cleaned, lang, { onStart: () => setEmotion('speaking'), onEnd: onDone });
  }, [isVoiceFirst, tutoringLocale, speak, setEmotion]);

  // Auto-speak the initial greeting for new sessions — always, regardless of voice-first toggle.
  // The greeting is Koko's first impression; it should always play so children know the app is ready.
  // Uses speak() directly (not autoSpeak) to bypass the isVoiceFirst gate.
  useEffect(() => {
    if (
      !greetingSpokenRef.current &&
      messages.length === 1 &&
      messages[0].id === 'koko-greeting' &&
      messages[0].content &&
      tutoringLocale !== 'pap' // Papiamento has no TTS voice
    ) {
      greetingSpokenRef.current = true;
      const cleaned = cleanForTts(messages[0].content, tutoringLocale);
      if (cleaned) {
        if (audioUnlocked) {
          speak(cleaned, getTtsLang(tutoringLocale), {
            onStart: () => setEmotion('speaking'),
            onEnd: () => setEmotion('idle'),
          });
        } else {
          pendingSpeakRef.current = { text: cleaned, lang: getTtsLang(tutoringLocale) };
        }
      }
    }
  }, [messages, tutoringLocale, speak, setEmotion, audioUnlocked]);

  // Eagerly pre-fetch TTS audio while the user hasn't unlocked audio yet (iOS fix).
  // On iOS, audio.play() MUST be called synchronously within a gesture handler —
  // any await (like a fetch) causes the gesture context to expire and play() to fail.
  // By pre-fetching here, the ArrayBuffer is ready by the time the user taps the banner.
  // handleUnlockAudio then plays it synchronously, no async in between.
  useEffect(() => {
    if (audioUnlocked || !isVoiceFirst || tutoringLocale === 'pap') return;
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.content);
    if (!lastAssistant) return;
    const cleaned = cleanForTts(lastAssistant.content, tutoringLocale);
    if (!cleaned) return;
    const lang = getTtsLang(tutoringLocale);
    // Slice to keep fetch fast; banner waits a few seconds so usually resolves before tap
    fetch('/nl/api/tutor/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleaned.slice(0, 800), lang, speed: 0.88 }),
    })
      .then(r => r.ok ? r.arrayBuffer() : null)
      .then(buf => { if (buf) resolvedBufferRef.current = { buffer: buf, lang }; })
      .catch(() => {});
  }, [messages, audioUnlocked, isVoiceFirst, tutoringLocale]);

  // Auto-start new sessions: Koko begins the lesson immediately after the greeting,
  // without the child needing to type anything first.
  // Not used for existing sessions (they use [VERVOLG_SESSIE] below) or assessment/huiswerk.
  const newSessionTriggeredRef = useRef(false);
  useEffect(() => {
    if (existingSessionId || isAssessmentMode) return;
    if (newSessionTriggeredRef.current) return;
    newSessionTriggeredRef.current = true;

    const triggerText: Record<string, string> = {
      nl:  '[START_SESSIE] Begin direct met de les. Stel je eerste vraag zonder inleiding.',
      pap: '[START_SESSIE] Cuminsa direktamente ku e les. Hasi bo prome pregunta sin introdukshon.',
      es:  '[START_SESSIE] Comienza directamente con la lección. Haz tu primera pregunta sin introducción.',
      en:  '[START_SESSIE] Start the lesson directly. Ask your first question without introduction.',
    };
    const trigger = triggerText[tutoringLocale] ?? triggerText.nl;

    const abortCtrl = new AbortController();
    const startMsgId = `assistant-start-${Date.now()}`;
    setIsLoading(true);
    setMessages(prev => [...prev, { id: startMsgId, role: 'assistant', content: '' }]);

    (async () => {
      try {
        const response = await fetch(`/${tutoringLocale}/api/tutor/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: trigger }],
            sessionId: null,
            subject,
            childId,
            hiatenTopic: hiatenTopicId
              ? (HIAAT_TOPICS[subject].find(t => t.id === hiatenTopicId)?.prompt ?? null)
              : null,
          }),
          signal: abortCtrl.signal,
        });

        if (!response.ok || !response.body) {
          setMessages(prev => prev.filter(m => m.id !== startMsgId));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          responseText += decoder.decode(value, { stream: true });
          setMessages(prev => prev.map(m =>
            m.id === startMsgId ? { ...m, content: responseText } : m
          ));
        }

        if (responseText) {
          lastCompletedRef.current = responseText;
          autoSpeak(startMsgId, responseText);
          setSessionStarted(true);
        } else {
          setMessages(prev => prev.filter(m => m.id !== startMsgId));
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Strict-mode double-fire: clean up and let the second run handle it
          setMessages(prev => prev.filter(m => m.id !== startMsgId));
          return;
        }
        setMessages(prev => prev.filter(m => m.id !== startMsgId));
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      abortCtrl.abort();
      // Reset ref so the second Strict Mode invocation can proceed
      newSessionTriggeredRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-continuation: when resuming an active session (< 30 min idle), auto-trigger Koko
  // to continue exactly where the lesson left off — without the child needing to type first.
  // Not used for assessment sessions (they have their own start flow).
  useEffect(() => {
    if (!existingSessionId || isAssessmentMode) return;

    const triggerText: Record<string, string> = {
      nl: '[VERVOLG_SESSIE] Hoi! Ik ben er weer. Ga direct verder met de les waar we gebleven waren.',
      pap: '[VERVOLG_SESSIE] Halo! Mi ta akí. Sigui direktamente ku e les unda nos a keda.',
      es: '[VERVOLG_SESSIE] ¡Hola! Ya estoy aquí. Continúa directamente con la lección donde nos quedamos.',
      en: '[VERVOLG_SESSIE] Hi! I\'m back. Continue directly with the lesson where we left off.',
    };
    const trigger = triggerText[tutoringLocale] ?? triggerText.nl;

    const abortCtrl = new AbortController();
    const resumeMsgId = `assistant-resume-${Date.now()}`;
    setIsLoading(true);
    setMessages([{ id: resumeMsgId, role: 'assistant', content: '' }]);

    (async () => {
      try {
        const response = await fetch(`/${tutoringLocale}/api/tutor/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: trigger }],
            sessionId: existingSessionId,
            subject,
            childId,
          }),
          signal: abortCtrl.signal,
        });

        if (!response.ok || !response.body) {
          setMessages([{ id: 'koko-greeting', role: 'assistant', content: t('kokoGreeting', { childName, subject: subjectLabel }) }]);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          responseText += decoder.decode(value, { stream: true });
          setMessages(prev => prev.map(m =>
            m.id === resumeMsgId ? { ...m, content: responseText } : m
          ));
        }

        if (responseText) {
          lastCompletedRef.current = responseText;
          autoSpeak(resumeMsgId, responseText);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Strict-mode double-fire: clean up and let the second run handle it
          setMessages([]);
          return;
        }
        // Network error: fall back to generic greeting
        setMessages([{ id: 'koko-greeting', role: 'assistant', content: t('kokoGreeting', { childName, subject: subjectLabel }) }]);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => abortCtrl.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!input.trim() && !pendingImage) || isLoading) return;

    // Stop listening/speaking if active
    if (isListening) stopListening();
    if (isSpeaking) stopSpeaking();
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    streamingPrefetchRef.current = null; // clear any stale prefetch from previous message

    const messageText = input.trim() || (pendingImage ? 'Kun je mijn huiswerk bekijken?' : '');

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      imageUrl: pendingImage || undefined,
    };

    // Unlock audio on first user message (browser autoplay policy)
    if (!audioUnlocked) setAudioUnlocked(true);

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const imageToSend = pendingImage;
    setPendingImage(null);
    setIsLoading(true);
    setError(null);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // After a locale switch, skip DB history for several messages so the old language can't bleed through
    const sendNoHistory = noHistoryCountRef.current > 0;
    if (sendNoHistory) noHistoryCountRef.current--;

    try {
      const response = await fetch(`/${tutoringLocale}/api/tutor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
            ...(m.imageUrl ? { imageUrl: m.imageUrl } : {}),
          })),
          sessionId: currentSessionId,
          subject,
          childId,
          hiatenTopic: hiatenTopicId
            ? (HIAAT_TOPICS[subject].find(t => t.id === hiatenTopicId)?.prompt ?? null)
            : null,
          huiswerkMode: huiswerkMode || undefined,
          noHistory: sendNoHistory || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          setRateLimited(true);
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      const assistantMessageId = `assistant-${Date.now()}`;
      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
      }]);

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;

        // Update the assistant message with streamed content
        setMessages(prev => prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: assistantMessage }
            : m
        ));

        // Prefetch TTS for the first complete sentence during streaming.
        // This starts the OpenAI API call early so audio is ready (or in-flight)
        // when streaming ends, eliminating most of the perceived TTS latency.
        if (isVoiceFirst && !streamingPrefetchRef.current) {
          const cleanedSoFar = cleanForTts(assistantMessage, tutoringLocale);
          if (cleanedSoFar.length >= 80) {
            const lastSentEnd = Math.max(
              cleanedSoFar.lastIndexOf('. '),
              cleanedSoFar.lastIndexOf('! '),
              cleanedSoFar.lastIndexOf('? '),
            );
            if (lastSentEnd >= 60) {
              const prefText = cleanedSoFar.slice(0, lastSentEnd + 1).trim();
              if (prefText) {
                streamingPrefetchRef.current = prefText;
                prefetchTts(prefText, getTtsLang(tutoringLocale), 0.88, false);
              }
            }
          }
        }

      }

      // Mark session as started (hides HiatenSelector)
      setSessionStarted(true);

      // Detect assessment completion signal in the full streamed response
      if (isAssessmentMode && ASSESSMENT_DONE_REGEX.test(assistantMessage)) {
        setAssessmentDone(true);
        // Strip signal from the visible message content in state
        setMessages(prev => prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: stripAssessmentSignal(m.content) }
            : m
        ));
      }

      // Auto-TTS after streaming completes
      if (assistantMessage && assistantMessage !== lastCompletedRef.current) {
        lastCompletedRef.current = assistantMessage;
        const speakText = isAssessmentMode ? stripAssessmentSignal(assistantMessage) : assistantMessage;

        // Auto-TTS: browser SpeechSynthesis starts immediately (no API latency)
        autoSpeak(assistantMessageId, speakText);

        // Auto-open whiteboard if [BORD] detected
        if (hasBordBlocks(assistantMessage)) {
          const content = extractBordContent(assistantMessage);
          if (content) {
            setBoardContent(content);
            setShowWhiteboard(true);
          }
          }

        // Auto-open zinsontleding panel als [ZINSONTLEDING] gedetecteerd
        if (hasZinsontledingBlocks(assistantMessage)) {
          const content = extractZinsontledingContent(assistantMessage);
          if (content) {
            try {
              const parsed: ZinsontledingData = JSON.parse(content);
              setZinsontledingData(parsed);
              setShowZinsontleding(true);
            } catch {
              // Stil negeren — JSON parse-fout in AI response
            }
          }
        }
      }

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message);
      } else {
        setError(t('connectionError'));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleMicToggle = () => {
    if (isSpeaking) stopSpeaking();
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Listen for language switches from the top nav LanguageSwitcher
  useEffect(() => {
    const handler = (e: CustomEvent) => setTutoringLocale(e.detail);
    window.addEventListener('tutoringLocaleChange', handler as EventListener);
    return () => window.removeEventListener('tutoringLocaleChange', handler as EventListener);
  }, []);

  // When instructietaal changes mid-session: stop TTS and have Koko immediately
  // respond in the new language (without the user needing to send another message).
  useEffect(() => {
    const prevLocale = prevLocaleRef.current;
    prevLocaleRef.current = tutoringLocale;

    // Skip initial mount and no-op changes
    if (prevLocale === tutoringLocale) return;

    // Always stop current speech
    stopSpeaking();
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();

    // Next 6 child messages skip DB history so Papiamento context can't bleed through
    noHistoryCountRef.current = 6;

    // If no conversation yet or a request is in flight, skip the re-explain
    if (messagesRef.current.length === 0 || isLoadingRef.current) return;

    // Cancel any previous locale-switch request
    if (localeSwitchAbortRef.current) localeSwitchAbortRef.current.abort();
    const switchAbort = new AbortController();
    localeSwitchAbortRef.current = switchAbort;

    // Explicit trigger — must be strong enough to override previous conversation language.
    // We send NO history at all (empty context) so previous language cannot bleed through.
    const switchTrigger: Record<string, string> = {
      nl:  'Wissel nu naar NEDERLANDS. Ga DIRECT door met de les waar we mee bezig waren, zonder opnieuw te beginnen. Spreek ALLEEN Nederlands.',
      pap: 'Cambia awo na PAPIAMENTO. Sigui DIRECTO cu e les cu nos tabata haci, sin cuminsa di nobo. Papia SOLAMENTE Papiamento.',
      es:  'Cambia ahora a ESPAÑOL. Continúa DIRECTAMENTE con la lección que estábamos haciendo, sin empezar de nuevo. Habla SOLO en español.',
      en:  'Switch now to ENGLISH. Continue DIRECTLY with the lesson we were doing, without starting over. Speak ONLY English.',
    };
    const triggerText = switchTrigger[tutoringLocale] ?? 'Continue.';
    const newLocale = tutoringLocale;

    // Include the last 6 messages (3 exchanges) so Koko knows what the child was working on.
    // 2 messages is not enough to establish a language pattern that overrides the system prompt.
    const recentContext = messagesRef.current
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const apiMessages = [
      ...recentContext,
      { role: 'user' as const, content: triggerText },
    ];

    const newMsgId = `assistant-switch-${Date.now()}`;
    setIsLoading(true);
    streamingPrefetchRef.current = null;
    setMessages(prev => [...prev, { id: newMsgId, role: 'assistant', content: '' }]);

    (async () => {
      try {
        const response = await fetch(`/${newLocale}/api/tutor/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            sessionId: currentSessionId,
            subject,
            childId,
            hiatenTopic: null,
            noHistory: true,
          }),
          signal: switchAbort.signal,
        });

        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          responseText += decoder.decode(value, { stream: true });
          setMessages(prev => prev.map(m =>
            m.id === newMsgId ? { ...m, content: responseText } : m
          ));

          // Prefetch TTS for first complete sentence (same as in handleSubmit)
          if (isVoiceFirst && !streamingPrefetchRef.current) {
            const cleanedSoFar = cleanForTts(responseText, tutoringLocale);
            if (cleanedSoFar.length >= 80) {
              const lastSentEnd = Math.max(
                cleanedSoFar.lastIndexOf('. '),
                cleanedSoFar.lastIndexOf('! '),
                cleanedSoFar.lastIndexOf('? '),
              );
              if (lastSentEnd >= 60) {
                const prefText = cleanedSoFar.slice(0, lastSentEnd + 1).trim();
                if (prefText) {
                  streamingPrefetchRef.current = prefText;
                  prefetchTts(prefText, getTtsLang(newLocale), 0.88, false);
                }
              }
            }
          }
        }

        if (responseText && !switchAbort.signal.aborted) {
          lastCompletedRef.current = responseText;
          autoSpeak(newMsgId, responseText);
        }
      } catch {
        // AbortError and network errors are silently ignored for locale switches
      } finally {
        if (!switchAbort.signal.aborted) {
          setIsLoading(false);
        }
      }
    })();
  }, [tutoringLocale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (localeSwitchAbortRef.current) {
        localeSwitchAbortRef.current.abort();
      }
      stopSpeaking();
    };
  }, []);

  // Unlock audio on first user gesture — required by browser autoplay policy.
  // Plays any pending TTS that was queued before the user interacted.
  const handleUnlockAudio = useCallback(() => {
    if (audioUnlocked) return;
    setAudioUnlocked(true);

    // STEP 1: Determine what text to speak
    const pending = pendingSpeakRef.current;
    pendingSpeakRef.current = null;
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.content);
    const textToSpeak = pending?.text
      ?? (lastAssistant ? cleanForTts(lastAssistant.content, tutoringLocale) : '');
    const langToSpeak = pending?.lang ?? getTtsLang(tutoringLocale);

    // STEP 2 (iOS + all browsers): ALWAYS unlock speechSynthesis synchronously within the
    // gesture. Once unlocked this way, speechSynthesis.speak() works for the rest of the session —
    // including from async contexts (e.g. after OpenAI TTS fails). This makes the fallback
    // in useSpeech.ts effective for all subsequent Koko messages on iOS.
    if (typeof window !== 'undefined' && window.speechSynthesis && textToSpeak) {
      const utt = new SpeechSynthesisUtterance(textToSpeak);
      utt.lang = langToSpeak;
      utt.rate = 0.88;
      setEmotion('speaking');
      utt.onend = () => setEmotion('idle');
      utt.onerror = () => setEmotion('idle');
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utt);
    }

    // STEP 3 (iOS): If we pre-fetched the OpenAI TTS buffer, play it synchronously.
    // This overrides the speechSynthesis above with higher-quality audio.
    const resolved = resolvedBufferRef.current;
    resolvedBufferRef.current = null;
    if (resolved) {
      window.speechSynthesis?.cancel(); // Stop the browser TTS; MP3 takes over
      try {
        const blob = new Blob([resolved.buffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        const done = () => { URL.revokeObjectURL(url); setEmotion('idle'); };
        audio.onended = done;
        audio.onerror = done;
        setEmotion('speaking');
        audio.play().catch(done);
      } catch {}
      return;
    }

    // STEP 4 (Chrome/desktop): async OpenAI TTS via speak() also works after a user gesture
    // on Chrome (gesture grants page-level autoplay permission permanently).
    if (textToSpeak) {
      speak(textToSpeak, langToSpeak, {
        onStart: () => { window.speechSynthesis?.cancel(); setEmotion('speaking'); },
        onEnd: () => setEmotion('idle'),
      });
    }
  }, [audioUnlocked, speak, setEmotion, messages, isVoiceFirst, tutoringLocale]);

  const handleZinsontledingClick = (content: string) => {
    try {
      const parsed: ZinsontledingData = JSON.parse(content);
      setZinsontledingData(parsed);
      setShowZinsontleding(true);
    } catch {
      // Stil negeren
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Header: Avatar + Timer + Voice Toggle */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-4">
        <KokoAvatar emotion={emotion} size="sm" />
        <div className="flex-1">
          <SessionTimer childAge={childAge} />
        </div>

        {/* Whiteboard toggle */}
        <button
          type="button"
          onClick={() => setShowWhiteboard(!showWhiteboard)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            showWhiteboard
              ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          title="Schoolbord"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
          </svg>
        </button>

        {/* Print Werkblad — shown as soon as any [OPDRACHT] block is present */}
        <WerkbladPrint
          messages={messages}
          childName={childName}
          subject={subject}
          subjectLabel={subjectLabel}
        />

        {/* Voice-first toggle — verborgen voor tekst */}
        {subject !== 'tekst' && (
          <button
            type="button"
            onClick={() => setVoiceFirst(!isVoiceFirstRaw)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isVoiceFirst
                ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-300'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title={isVoiceFirst ? 'Spraak-modus aan' : 'Spraak-modus uit'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
            {isVoiceFirstRaw ? 'Aan' : 'Uit'}
          </button>
        )}
      </div>

      {/* Audio Unlock Banner — shown until first user gesture unlocks browser audio */}
      {!audioUnlocked && isVoiceFirst && tutoringLocale !== 'pap' && (
        <button
          type="button"
          onClick={handleUnlockAudio}
          className="w-full bg-sky-500 hover:bg-sky-600 text-white px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
          Tik hier om geluid in te schakelen 🔊
        </button>
      )}

      {/* Assessment Mode Banner */}
      {isAssessmentMode && !assessmentDone && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <span className="text-amber-500" aria-hidden="true">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="text-sm font-medium text-amber-800">
            Beginsituatietoets — Koko bepaalt jouw startpunt
          </span>
        </div>
      )}

      {/* Huiswerk Hulp Banner */}
      {huiswerkMode && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2">
          <span className="text-blue-500" aria-hidden="true">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.255 0 2.443.29 3.5.804V4.804zM10.5 4.804A7.968 7.968 0 0114.5 4c1.255 0 2.443.29 3.5.804v10a7.969 7.969 0 01-3.5-.804V4.804z" />
            </svg>
          </span>
          <span className="text-sm font-medium text-blue-800">
            Huiswerk Hulp actief — Koko analyseert jouw huiswerk
          </span>
        </div>
      )}

      {/* Hiaat Selector — shown before first message, hidden once session starts */}
      {!isAssessmentMode && !sessionStarted && !existingSessionId && !huiswerkMode &&
        !(['geschiedenis', 'aardrijkskunde', 'kennis_der_natuur'] as string[]).includes(subject) && (
        <HiatenSelector
          subject={subject}
          selected={hiatenTopicId}
          onSelect={(topic) => setHiatenTopicId(topic?.id ?? null)}
        />
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message: Message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            locale={tutoringLocale}
            childAge={childAge}
            imageUrl={message.imageUrl}
            isStreaming={isLoading && message.id === messages[messages.length - 1]?.id && message.role === 'assistant'}
            allowDictationAutoPlay={message.id === dictationReadyId}
            disableReadAloud={subject === 'tekst'}
            onBoardClick={(boardText) => {
              setBoardContent(boardText);
              setShowWhiteboard(true);
            }}
            onZinsontledingClick={handleZinsontledingClick}
          />
        ))}

        {/* Loading Indicator with Avatar */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-start gap-3">
            <KokoAvatar emotion="thinking" size="sm" className="flex-shrink-0" />
            <div className="bg-sky-100 text-sky-900 rounded-2xl rounded-tl-sm px-5 py-3 max-w-[80%] shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="text-sm text-sky-600">{t('thinking')}</span>
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && !rateLimited && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Rate Limited Message */}
        {rateLimited && (
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-900 p-4 rounded-lg">
            <p className="font-semibold">{t('rateLimitReached')}</p>
          </div>
        )}

        {/* Assessment Completion Banner — inline after last message */}
        {isAssessmentMode && assessmentDone && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm">
            <span className="text-green-500 flex-shrink-0" aria-hidden="true">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">Toets afgerond! Je niveau is bepaald.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/tutor/${childId}/${subject}`)}
              className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              Ga naar de les
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>


      {/* Pending Image Preview */}
      {pendingImage && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
          <div className="flex items-center gap-3">
            <img
              src={pendingImage}
              alt="Huiswerk preview"
              className="w-16 h-16 object-cover rounded-lg border-2 border-amber-300"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Huiswerk foto klaar om te versturen</p>
              <p className="text-xs text-amber-600">Typ eventueel een vraag erbij, of druk op verzenden</p>
            </div>
            <button
              onClick={() => setPendingImage(null)}
              className="text-amber-600 hover:text-red-600 p-1"
              aria-label="Verwijder foto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input Area — Voice-First Layout */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Big Mic Button (voice-first mode) */}
        {isVoiceFirst && sttSupported && (
          <div className="flex justify-center mb-3">
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={isLoading || rateLimited}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-red-500 text-white scale-110'
                  : 'bg-gradient-to-br from-sky-400 to-sky-600 text-white hover:from-sky-500 hover:to-sky-700 active:scale-95'
              }`}
              aria-label={isListening ? 'Stop opnemen' : 'Spreek in'}
            >
              {/* Pulse ring when listening */}
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
              )}

              {isListening ? (
                <VoiceWaveform isActive={true} color="white" />
              ) : (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Text input row with action buttons */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          {/* Camera/Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || rateLimited}
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-amber-100 text-amber-600 hover:bg-amber-200 hover:text-amber-700 active:scale-95"
            aria-label="Upload huiswerk foto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </button>

          {/* Phone Upload Button */}
          <button
            type="button"
            onClick={() => setShowPhoneUpload(true)}
            disabled={isLoading || rateLimited}
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-purple-100 text-purple-600 hover:bg-purple-200 hover:text-purple-700 active:scale-95"
            aria-label="Upload via telefoon"
            title="Foto maken met telefoon"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </button>

          {/* Small mic button (non-voice-first mode) */}
          {!isVoiceFirst && sttSupported && (
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={isLoading || rateLimited}
              className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-sky-100 hover:text-sky-600'
              }`}
              aria-label={isListening ? 'Stop opnemen' : 'Spreek in'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            disabled={isLoading || rateLimited}
            placeholder={isListening ? 'Luisteren...' : pendingImage ? 'Stel een vraag over je huiswerk...' : t('sendMessage')}
            className={`flex-1 px-4 py-2.5 text-lg border-2 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all ${
              isListening ? 'border-red-300 bg-red-50' : pendingImage ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
            }`}
          />

          <button
            type="submit"
            disabled={isLoading || rateLimited || (!input.trim() && !pendingImage)}
            className="bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold px-5 py-2.5 rounded-xl hover:from-sky-600 hover:to-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md disabled:shadow-none flex items-center gap-2"
          >
            <span>{t('send')}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </form>
      </div>

      {/* Whiteboard Panel */}
      <WhiteboardPanel
        isOpen={showWhiteboard}
        onToggle={() => setShowWhiteboard(!showWhiteboard)}
        boardContent={boardContent}
        subject={subject}
        drawingEnabled={false}
        childAge={childAge}
      />

      {/* Zinsontleding Panel */}
      {zinsontledingData && (
        <ZinsontledingPanel
          data={zinsontledingData}
          isOpen={showZinsontleding}
          onClose={() => setShowZinsontleding(false)}
        />
      )}

      {/* Phone Upload Modal (QR code for phone-to-PC transfer) */}
      {showPhoneUpload && (
        <PhoneUploadModal
          childId={childId}
          sessionId={currentSessionId || undefined}
          locale={locale}
          onImageReceived={(imageData) => {
            setPendingImage(imageData);
            setShowPhoneUpload(false);
          }}
          onClose={() => setShowPhoneUpload(false)}
        />
      )}
    </div>
  );
}
