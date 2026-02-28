'use client';

/**
 * RapportPrintWrapper — Client Component
 *
 * Voegt een "Opslaan als PDF" knop toe die het rapport afdrukt via react-to-print v3.
 * Wikkelt de RapportView sectie in met een ref voor print-targeting.
 */

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

interface Props {
  children: React.ReactNode;
  label: string;
}

export default function RapportPrintWrapper({ children, label }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Rapport_${new Date().toISOString().slice(0, 10)}`,
    pageStyle: `
      @media print {
        body { font-family: Arial, sans-serif; font-size: 12pt; color: #000; }
        .no-print { display: none !important; }
        @page { margin: 2cm; size: A4; }
      }
    `,
  });

  return (
    <>
      <button
        onClick={() => handlePrint()}
        className="no-print bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl font-semibold text-sm inline-flex items-center gap-2 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {label}
      </button>
      <div ref={printRef}>{children}</div>
    </>
  );
}
