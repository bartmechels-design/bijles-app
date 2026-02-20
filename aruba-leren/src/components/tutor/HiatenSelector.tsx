'use client';

import { HIAAT_TOPICS, type HiaatTopic } from '@/lib/ai/prompts/hiaten-prompts';
import type { Subject } from '@/types/tutoring';

interface HiatenSelectorProps {
  subject: Subject;
  selected: string | null;
  onSelect: (topic: HiaatTopic | null) => void;
}

export default function HiatenSelector({ subject, selected, onSelect }: HiatenSelectorProps) {
  const topics = HIAAT_TOPICS[subject] ?? [];

  if (topics.length === 0) return null;

  return (
    <div className="px-4 py-3 bg-violet-50 border border-violet-200 rounded-2xl mx-4 mb-4">
      <p className="text-sm font-semibold text-gray-600 mb-2">
        Wil je aan iets specifieks werken?
      </p>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onSelect(selected === topic.id ? null : topic)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selected === topic.id
                ? 'bg-violet-600 text-white ring-2 ring-violet-300'
                : 'bg-white border border-violet-300 text-violet-700 hover:bg-violet-50'
            }`}
          >
            {topic.label}
          </button>
        ))}
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300 transition-all"
          >
            Geen specifiek onderwerp
          </button>
        )}
      </div>
    </div>
  );
}
