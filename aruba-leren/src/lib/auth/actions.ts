'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Server action for user signup with email and password
 * Creates auth user and updates profile with consent information
 */
export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const consentGiven = formData.get('consentGiven') as string
  const locale = (formData.get('locale') as string) || 'nl'

  // Validate inputs
  if (!email || !email.includes('@')) {
    return { error: 'Ongeldig e-mailadres' }
  }

  if (!password || password.length < 8) {
    return { error: 'Wachtwoord moet minimaal 8 tekens bevatten' }
  }

  if (consentGiven !== 'true') {
    return { error: 'Toestemming is verplicht' }
  }

  const supabase = await createClient()

  // Create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    // Translate common Supabase errors to Dutch
    if (error.message.includes('already registered')) {
      return { error: 'E-mailadres is al geregistreerd' }
    }
    if (error.message.includes('rate limit')) {
      return { error: 'Te veel pogingen. Wacht even en probeer het opnieuw.' }
    }
    return { error: error.message }
  }

  // Update profile with consent information if user was created
  if (data.user?.id) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        consent_given: true,
        consent_date: new Date().toISOString(),
      })
      .eq('user_id', data.user.id)

    if (updateError) {
      console.error('Failed to update consent:', updateError)
      // Don't fail signup if consent update fails - user is already created
    }
  }

  return { success: true }
}

/**
 * Server action for user signin with email and password
 */
export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const locale = (formData.get('locale') as string) || 'nl'

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Translate common Supabase errors to Dutch
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'E-mailadres of wachtwoord is onjuist' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'E-mailadres nog niet bevestigd' }
    }
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Server action for user signout
 */
export async function signOut() {
  const supabase = await createClient()

  await supabase.auth.signOut()

  // Redirect to home page after signout
  redirect('/nl')
}
