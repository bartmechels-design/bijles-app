import { createClient } from '@/lib/supabase/server';

// Re-export shared types and pure helpers from utils.ts.
// queries.ts is server-only (it imports next/headers via createClient).
// For client components, import directly from '@/lib/vacations/utils'.
export type { SchoolVacation } from './utils';
export { getCurrentSchoolYear } from './utils';

import type { SchoolVacation } from './utils';

/**
 * Fetch school vacations filtered by school year, ordered by start_date ascending.
 * Uses regular Supabase server client — RLS allows authenticated read.
 */
export async function getVacations(schoolYear: string): Promise<SchoolVacation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('school_vacations')
    .select('*')
    .eq('school_year', schoolYear)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error fetching vacations:', error);
    return [];
  }

  return (data as SchoolVacation[]) ?? [];
}
