'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { LevelPoint } from '@/lib/rapport/rapport-data';

interface Props {
  data: LevelPoint[];
  subjectLabel: string;
}

/**
 * Lijngrafieken voor niveau-over-tijd per vak.
 * Toont placeholder als minder dan 2 datapunten beschikbaar zijn.
 */
export default function ProgressLineChart({ data, subjectLabel }: Props) {
  // Guard: toon placeholder als < 2 punten
  if (data.length < 2) {
    return (
      <p className="text-sm text-gray-400 italic py-4">Te weinig data voor grafiek</p>
    );
  }

  // Formatteer datum als "15 jan"
  const formatted = data.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={formatted} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value: number | undefined) => [
            value !== undefined ? `Niveau ${value}` : '',
            subjectLabel,
          ]}
        />
        <Line
          type="monotone"
          dataKey="level"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ r: 4, fill: '#0ea5e9' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
