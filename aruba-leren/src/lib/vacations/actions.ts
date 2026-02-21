'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, isAdmin } from '@/lib/auth/admin';

/**
 * Upsert (create or update) a school vacation entry.
 * - id present in FormData → UPDATE
 * - id absent → INSERT
 * Admin only. Uses service role client to bypass RLS.
 */
export async function upsertVacation(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    return { error: 'Geen toegang' };
  }

  const id = formData.get('id') as string | null;
  const name = (formData.get('name') as string | null)?.trim() ?? '';
  const start_date = (formData.get('start_date') as string | null)?.trim() ?? '';
  const end_date = (formData.get('end_date') as string | null)?.trim() ?? '';
  const school_year = (formData.get('school_year') as string | null)?.trim() ?? '';
  const is_public_holiday = formData.get('is_public_holiday') === 'true';

  // Validation
  if (!name) {
    return { error: 'Naam is verplicht' };
  }
  if (!start_date || isNaN(Date.parse(start_date))) {
    return { error: 'Begindatum is ongeldig' };
  }
  if (!end_date || isNaN(Date.parse(end_date))) {
    return { error: 'Einddatum is ongeldig' };
  }
  if (new Date(end_date) < new Date(start_date)) {
    return { error: 'Einddatum moet op of na begindatum liggen' };
  }
  if (!school_year) {
    return { error: 'Schooljaar is verplicht' };
  }

  const adminClient = createAdminClient();

  if (id) {
    // Update existing
    const { error } = await adminClient
      .from('school_vacations')
      .update({ name, start_date, end_date, school_year, is_public_holiday })
      .eq('id', id);

    if (error) {
      console.error('Error updating vacation:', error);
      return { error: 'Vakantie bijwerken mislukt' };
    }
  } else {
    // Insert new
    const { error } = await adminClient
      .from('school_vacations')
      .insert({ name, start_date, end_date, school_year, is_public_holiday });

    if (error) {
      console.error('Error inserting vacation:', error);
      return { error: 'Vakantie opslaan mislukt' };
    }
  }

  // Revalidate all locale routes from root layout
  revalidatePath('/', 'layout');

  return { success: true };
}

/**
 * Delete a school vacation entry by id.
 * Admin only. Uses service role client to bypass RLS.
 */
export async function deleteVacation(
  id: string
): Promise<{ success: true } | { error: string }> {
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    return { error: 'Geen toegang' };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('school_vacations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting vacation:', error);
    return { error: 'Vakantie verwijderen mislukt' };
  }

  // Revalidate all locale routes from root layout
  revalidatePath('/', 'layout');

  return { success: true };
}
