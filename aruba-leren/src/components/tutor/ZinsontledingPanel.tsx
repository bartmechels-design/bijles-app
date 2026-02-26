'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface ZinsWord {
  word: string;
  role: 'PV' | 'GEZ' | 'ONS' | 'LV' | 'MWV' | 'NONE';
  label: string; // Nederlandse naam, bijv. "Persoonsvorm"
}

export interface ZinsontledingData {
  sentence: string;
  words: ZinsWord[];
}

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PV:   { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-400' },
  GEZ:  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-400' },
  ONS:  { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-400' },
  LV:   { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-400' },
  MWV:  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-400' },
  NONE: { bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-300' },
};

const ROLE_LABELS: Record<string, string> = {
  PV:  'Persoonsvorm',
  GEZ: 'Gezegde',
  ONS: 'Onderwerp',
  LV:  'Lijdend voorwerp',
  MWV: 'Meewerkend voorwerp',
};

const ASSIGNABLE_ROLES = ['PV', 'GEZ', 'ONS', 'LV', 'MWV'] as const;

interface ZinsontledingPanelProps {
  data: ZinsontledingData;
  isOpen: boolean;
  onClose: () => void;
}

export default function ZinsontledingPanel({ data, isOpen, onClose }: ZinsontledingPanelProps) {
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [selectedWordIdx, setSelectedWordIdx] = useState<number | null>(null);
  const [correctFeedback, setCorrectFeedback] = useState<number[]>([]);

  // Reset state when new data is loaded
  useEffect(() => {
    setAssignments({});
    setSelectedWordIdx(null);
    setCorrectFeedback([]);
  }, [data]);

  const isCorrect = useCallback((idx: number) => {
    return assignments[idx] === data.words[idx].role;
  }, [assignments, data.words]);

  const handleWordClick = (idx: number) => {
    const word = data.words[idx];
    // Only words WITH a grammatical role are interactive (student must discover them)
    // NONE words (lidwoorden, voorzetsels) are display-only
    if (word.role === 'NONE') return;
    setSelectedWordIdx(selectedWordIdx === idx ? null : idx);
  };

  const handleRoleAssign = (idx: number, role: string) => {
    setAssignments(prev => ({ ...prev, [idx]: role }));
    setSelectedWordIdx(null);

    // Check correctness against the AI-provided role
    const word = data.words[idx];
    if (role === word.role) {
      // Correct! Trigger animation
      setCorrectFeedback(prev => [...prev, idx]);
      setTimeout(() => {
        setCorrectFeedback(prev => prev.filter(i => i !== idx));
      }, 1500);
    }
  };

  const correctCount = Object.entries(assignments).filter(([idxStr, assignedRole]) => {
    const idx = parseInt(idxStr);
    return assignedRole === data.words[idx]?.role;
  }).length;

  const totalInteractiveWords = data.words.filter(w => w.role !== 'NONE').length;

  if (!data) {
    return (
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex items-center justify-center">
        <p className="text-gray-500">Geen zinsontleding beschikbaar.</p>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`
          fixed z-50 bg-white shadow-xl transition-transform duration-300 ease-in-out
          bottom-0 left-0 right-0 h-2/3 rounded-t-2xl
          md:top-0 md:right-0 md:bottom-auto md:left-auto md:h-full md:w-80 md:rounded-none
          ${isOpen
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:translate-x-full'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-green-50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.143 2.94 2.736 3.15a48.054 48.054 0 00.784.057A3.375 3.375 0 006.375 18H5.25A2.25 2.25 0 013 15.75V8.25A2.25 2.25 0 015.25 6H18A2.25 2.25 0 0120.25 8.25v7.5A2.25 2.25 0 0118 18h-1.125a3.375 3.375 0 01-.784-.057 48.054 48.054 0 00-.784-.057A3.375 3.375 0 0113.5 18h-1.125c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125V18" />
            </svg>
            <h2 className="font-bold text-green-800 text-base">Zinsontleding</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Sluit zinsontleding"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-56px)] px-4 py-4 space-y-4">
          {/* Full sentence */}
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Zin</p>
            <p className="text-base font-medium text-gray-800">{data.sentence}</p>
          </div>

          {/* Legend */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kleurenlegenda</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ROLE_LABELS).map(([role, label]) => {
                const colors = ROLE_COLORS[role];
                return (
                  <span
                    key={role}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    <span className="font-bold">{role}</span>
                    <span className="opacity-75">{label}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Word chips */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ontleed de zin</p>
            <div className="flex flex-wrap gap-2">
              {data.words.map((word, idx) => {
                const assignedRole = assignments[idx];
                // Hide AI role until student assigns — gray until discovered
                const effectiveRole = word.role !== 'NONE' ? (assignedRole || 'NONE') : 'NONE';
                const colors = ROLE_COLORS[effectiveRole] || ROLE_COLORS.NONE;
                const isClickable = word.role !== 'NONE';
                const isSelected = selectedWordIdx === idx;
                const isCelebrating = correctFeedback.includes(idx);

                return (
                  <div key={idx} className="relative">
                    <button
                      type="button"
                      onClick={() => isClickable ? handleWordClick(idx) : undefined}
                      disabled={!isClickable}
                      title={word.role === 'NONE' ? '' : (assignedRole ? ROLE_LABELS[assignedRole] : 'Klik om een rol toe te wijzen')}
                      className={`
                        inline-flex flex-col items-center px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all
                        ${colors.bg} ${colors.text} ${colors.border}
                        ${isClickable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
                        ${isSelected ? 'ring-2 ring-offset-1 ring-sky-400 scale-105' : ''}
                        ${isCelebrating ? 'animate-bounce' : ''}
                      `}
                    >
                      <span>{word.word}</span>
                      {assignedRole ? (
                        <span className="text-[10px] font-bold opacity-70 mt-0.5">{assignedRole}</span>
                      ) : word.role !== 'NONE' ? (
                        <span className="text-[10px] opacity-50 mt-0.5">?</span>
                      ) : null}
                    </button>

                    {/* Correct indicator */}
                    {isCelebrating && (
                      <span className="absolute -top-2 -right-2 text-base">
                        Goed!
                      </span>
                    )}

                    {/* Role picker dropdown */}
                    {isSelected && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 bg-white rounded-xl shadow-lg border border-gray-200 p-2 min-w-[160px]">
                        <p className="text-xs text-gray-500 mb-1.5 font-medium text-center">Kies een rol:</p>
                        <div className="flex flex-col gap-1">
                          {ASSIGNABLE_ROLES.map((role) => {
                            const roleColors = ROLE_COLORS[role];
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => handleRoleAssign(idx, role)}
                                className={`
                                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all hover:scale-[1.02] active:scale-[0.98]
                                  ${roleColors.bg} ${roleColors.text} ${roleColors.border}
                                `}
                              >
                                <span className="font-bold w-8">{role}</span>
                                <span className="text-xs">{ROLE_LABELS[role]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress bar */}
          {totalInteractiveWords > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Voortgang</p>
                <span className="text-sm font-bold text-green-700">{correctCount} / {totalInteractiveWords}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalInteractiveWords > 0 ? (correctCount / totalInteractiveWords) * 100 : 0}%` }}
                />
              </div>
              {correctCount === totalInteractiveWords && totalInteractiveWords > 0 && (
                <p className="text-center text-green-700 font-bold text-sm mt-2">
                  Helemaal goed! Alle woorden zijn correct!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
