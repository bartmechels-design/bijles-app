'use client';

import { useEffect, useState } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export default function ChatMessage({ role, content, isStreaming = false }: ChatMessageProps) {
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    setShouldAnimate(true);
    const timer = setTimeout(() => setShouldAnimate(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (role === 'assistant') {
    return (
      <div
        className={`flex items-start gap-3 ${shouldAnimate ? 'animate-fade-in' : ''}`}
      >
        <div className="bg-sky-100 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🐵</span>
        </div>
        <div className="bg-sky-100 text-sky-900 rounded-2xl rounded-tl-sm px-5 py-3 max-w-[80%] shadow-sm">
          <p className="text-lg whitespace-pre-wrap">
            {content}
            {isStreaming && (
              <span className="inline-block w-2 h-5 bg-sky-600 ml-1 animate-pulse"></span>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 justify-end ${shouldAnimate ? 'animate-fade-in' : ''}`}
    >
      <div className="bg-amber-500 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%] shadow-sm">
        <p className="text-lg whitespace-pre-wrap">
          {content}
        </p>
      </div>
    </div>
  );
}
