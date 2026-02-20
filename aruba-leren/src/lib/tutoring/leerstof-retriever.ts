import { createClient } from '@/lib/supabase/server';
import type { Subject } from '@/types/tutoring';

const ZAAKVAKKEN: Subject[] = ['geschiedenis', 'aardrijkskunde', 'kennis_der_natuur'];

export function isZaakvak(subject: Subject): boolean {
  return ZAAKVAKKEN.includes(subject);
}

/**
 * Fetches the most recently uploaded active leerstof for a subject.
 * Returns the content text formatted for injection into the system prompt, or null if none uploaded.
 * Only applicable to zaakvakken (geschiedenis, aardrijkskunde, kennis_der_natuur).
 */
export async function getActiveLeerstof(subject: Subject): Promise<string | null> {
  if (!isZaakvak(subject)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leerstof_items')
    .select('title, content')
    .eq('subject', subject)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return `## Leerstof: ${data.title}\n\n${data.content}`;
}
