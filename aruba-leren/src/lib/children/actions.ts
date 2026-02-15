'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Server action to add a new child profile
 * Validates input, checks authentication, and inserts child record
 */
export async function addChild(formData: FormData) {
  const firstName = formData.get('firstName') as string
  const ageStr = formData.get('age') as string
  const gradeStr = formData.get('grade') as string
  const locale = (formData.get('locale') as string) || 'nl'

  // Validate inputs
  if (!firstName || firstName.trim().length === 0) {
    return { error: 'Voornaam is verplicht' }
  }

  const age = parseInt(ageStr, 10)
  if (isNaN(age) || age < 6 || age > 12) {
    return { error: 'Leeftijd moet tussen 6 en 12 zijn' }
  }

  const grade = parseInt(gradeStr, 10)
  if (isNaN(grade) || grade < 1 || grade > 6) {
    return { error: 'Klas moet tussen 1 en 6 zijn' }
  }

  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Niet ingelogd' }
  }

  // Get parent profile ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Profiel niet gevonden' }
  }

  // Insert child record
  const { error: insertError } = await supabase
    .from('children')
    .insert({
      parent_id: profile.id,
      first_name: firstName.trim(),
      age: age,
      grade: grade,
    })

  if (insertError) {
    console.error('Failed to add child:', insertError)
    return { error: 'Kon kind niet toevoegen' }
  }

  // Revalidate dashboard to show new child
  revalidatePath(`/${locale}/dashboard`)

  return { success: true }
}

/**
 * Server action to update existing child profile
 * Validates ownership before updating
 */
export async function updateChild(childId: string, formData: FormData) {
  const firstName = formData.get('firstName') as string
  const ageStr = formData.get('age') as string
  const gradeStr = formData.get('grade') as string
  const locale = (formData.get('locale') as string) || 'nl'

  // Validate inputs
  if (!firstName || firstName.trim().length === 0) {
    return { error: 'Voornaam is verplicht' }
  }

  const age = parseInt(ageStr, 10)
  if (isNaN(age) || age < 6 || age > 12) {
    return { error: 'Leeftijd moet tussen 6 en 12 zijn' }
  }

  const grade = parseInt(gradeStr, 10)
  if (isNaN(grade) || grade < 1 || grade > 6) {
    return { error: 'Klas moet tussen 1 en 6 zijn' }
  }

  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Niet ingelogd' }
  }

  // Get parent profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profiel niet gevonden' }
  }

  // Verify ownership - child must belong to current user's profile
  const { data: child, error: fetchError } = await supabase
    .from('children')
    .select('parent_id')
    .eq('id', childId)
    .single()

  if (fetchError || !child) {
    return { error: 'Kind niet gevonden' }
  }

  if (child.parent_id !== profile.id) {
    return { error: 'Geen toegang tot dit kind' }
  }

  // Update child record
  const { error: updateError } = await supabase
    .from('children')
    .update({
      first_name: firstName.trim(),
      age: age,
      grade: grade,
      updated_at: new Date().toISOString(),
    })
    .eq('id', childId)

  if (updateError) {
    console.error('Failed to update child:', updateError)
    return { error: 'Kon kind niet bijwerken' }
  }

  // Revalidate dashboard
  revalidatePath(`/${locale}/dashboard`)

  return { success: true }
}

/**
 * Server action to delete child profile
 * Validates ownership before deletion
 */
export async function deleteChild(childId: string, locale: string = 'nl') {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Niet ingelogd' }
  }

  // Get parent profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profiel niet gevonden' }
  }

  // Verify ownership - child must belong to current user's profile
  const { data: child, error: fetchError } = await supabase
    .from('children')
    .select('parent_id')
    .eq('id', childId)
    .single()

  if (fetchError || !child) {
    return { error: 'Kind niet gevonden' }
  }

  if (child.parent_id !== profile.id) {
    return { error: 'Geen toegang tot dit kind' }
  }

  // Delete child record
  const { error: deleteError } = await supabase
    .from('children')
    .delete()
    .eq('id', childId)

  if (deleteError) {
    console.error('Failed to delete child:', deleteError)
    return { error: 'Kon kind niet verwijderen' }
  }

  // Revalidate dashboard
  revalidatePath(`/${locale}/dashboard`)

  return { success: true }
}
