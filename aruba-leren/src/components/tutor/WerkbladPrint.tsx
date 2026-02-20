'use client';

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { extractOpdrachtBlocks } from './ChatMessage';

interface WerkbladPrintProps {
  messages: Array<{ role: string; content: string }>;
  childName: string;
  subject: string;
  subjectLabel: string;
}

const PAGE_STYLE = `
  @page { size: A4; margin: 20mm 15mm; }
  @media print {
    body { font-family: Arial, sans-serif; font-size: 14pt; }
    .werkblad-header { border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 16px; }
    .opdracht-card { border: 1px solid #ccc; border-radius: 8px; padding: 12px; margin-bottom: 16px; page-break-inside: avoid; }
    .opdracht-title { font-weight: bold; color: #555; font-size: 11pt; margin-bottom: 6px; }
    .opdracht-content { white-space: pre-wrap; line-height: 2; }
    .answer-line { border-bottom: 1px solid #999; margin-top: 8px; height: 24px; }
  }
`;

export default function WerkbladPrint({ messages, childName, subjectLabel }: WerkbladPrintProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef, pageStyle: PAGE_STYLE });

  const opdrachten = messages
    .filter(m => m.role === 'assistant')
    .flatMap(m => extractOpdrachtBlocks(m.content));

  if (opdrachten.length === 0) return null;

  return (
    <>
      {/* Hidden printable content */}
      <div ref={contentRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div className="werkblad-header">
          <h1>Werkblad — {subjectLabel}</h1>
          <p>Naam: {childName} &nbsp;&nbsp; Datum: {new Date().toLocaleDateString('nl-NL')}</p>
        </div>
        {opdrachten.map((text, i) => (
          <div key={i} className="opdracht-card">
            <div className="opdracht-title">Opdracht {i + 1}</div>
            <div className="opdracht-content">{text}</div>
            <div className="answer-line" />
          </div>
        ))}
      </div>

      {/* Trigger button */}
      <button
        type="button"
        onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-all"
        title="Print werkblad"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
        </svg>
        Print Werkblad
      </button>
    </>
  );
}
