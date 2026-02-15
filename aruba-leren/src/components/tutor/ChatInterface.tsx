'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Subject } from '@/types/tutoring';
import ChatMessage from './ChatMessage';
import SessionTimer from './SessionTimer';

// Message type
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  childId: string;
  childAge: number;
  childName: string;
  subject: Subject;
  locale: string;
  existingSessionId: string | null;
  subjectLabel: string;
}

export default function ChatInterface({
  childId,
  childAge,
  childName,
  subject,
  locale,
  existingSessionId,
  subjectLabel,
}: ChatInterfaceProps) {
  const t = useTranslations('tutor');
  const [currentSessionId, setCurrentSessionId] = useState(existingSessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/${locale}/api/tutor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          sessionId: currentSessionId,
          subject,
          childId,
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
      }

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          // Request was aborted, do nothing
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Session Timer */}
      <div className="px-4 py-2 bg-white border-b border-gray-200">
        <SessionTimer childAge={childAge} />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message: Message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            isStreaming={isLoading && message.id === messages[messages.length - 1]?.id && message.role === 'assistant'}
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-start gap-3">
            <div className="bg-sky-100 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🐵</span>
            </div>
            <div className="bg-sky-100 text-sky-900 rounded-2xl rounded-tl-sm px-5 py-3 max-w-[80%] shadow-sm">
              <div className="flex gap-1">
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
            <p className="font-semibold">{t('connectionError')}</p>
          </div>
        )}

        {/* Rate Limited Message */}
        {rateLimited && (
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-900 p-4 rounded-lg">
            <p className="font-semibold">{t('rateLimitReached')}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || rateLimited}
            placeholder={t('sendMessage')}
            className="flex-1 px-5 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || rateLimited || !input.trim()}
            className="bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold px-6 py-3 rounded-xl hover:from-sky-600 hover:to-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md disabled:shadow-none flex items-center gap-2"
          >
            <span>{t('send')}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
