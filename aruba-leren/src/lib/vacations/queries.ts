import { createClient } from '@/lib/supabase/server';

export interface SchoolVacation {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  school_year: string;
  is_public_holiday: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Returns the current Aruba school year string.
 * Aruba school year starts in August (month index 7).
 * If month >= 7 (August): "${currentYear}-${currentYear+1}"
 * Otherwise: "${currentYear-1}-${currentYear}"
 */
export function getCurrentSchoolYear(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed, 7 = August
  const year = now.getFullYear();

  if (month >= 7) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

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
