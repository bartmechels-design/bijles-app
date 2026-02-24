/**
 * Shared vacation types and utilities.
 * This file is client-safe (no server imports).
 */

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
 *
 * This file is client-safe (no server imports).
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
