'use client';

/**
 * ProgressLineChartWrapper — Client Component wrapper
 *
 * Wraps ProgressLineChart with dynamic import (ssr: false) from a Client Component,
 * which is required by Next.js App Router (dynamic ssr:false cannot be used in Server Components).
 */

import dynamic from 'next/dynamic';
import type { LevelPoint } from '@/lib/rapport/rapport-data';

const ProgressLineChart = dynamic(() => import('./ProgressLineChart'), { ssr: false });

interface Props {
  data: LevelPoint[];
  subjectLabel: string;
}

export default function ProgressLineChartWrapper({ data, subjectLabel }: Props) {
  return <ProgressLineChart data={data} subjectLabel={subjectLabel} />;
}
