'use server';

import { createClient } from '@/lib/supabase/server';
import { validateImageFile } from '@/lib/storage/upload';
import type { SubscriptionPeriod } from '@/lib/subscription/types';
import { revalidatePath } from 'next/cache';

/**
 * Upload payment proof and create payment request
 *
 * Flow:
 * 1. Authenticate user
 * 2. Validate subscription period
 * 3. Validate uploaded file (magic bytes check)
 * 4. Upload to Supabase Storage
 * 5. Create payment_request record
 *
 * @param formData - Contains payment_proof (File), subscription_period, optional comment
 * @returns { success?: boolean; error?: string }
 */
export async function uploadPaymentProof(formData: FormData) {
  const supabase = await createClient();

  // 1. Authenticate
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'U moet ingelogd zijn om een betalingsverzoek in te dienen' };
  }

  // 2. Extract and validate form data
  const file = formData.get('payment_proof') as File | null;
  const subscription_period = formData.get('subscription_period') as string;
  const comment = formData.get('comment') as string | null;

  if (!file) {
    return { error: 'Geen bestand geüpload' };
  }

  // Validate subscription period
  const validPeriods: SubscriptionPeriod[] = [
    'per_session',
    'per_week',
    'per_month',
    'per_school_year',
  ];
  if (!validPeriods.includes(subscription_period as SubscriptionPeriod)) {
    return { error: 'Ongeldige abonnementsperiode' };
  }

  // 3. Validate file using magic bytes
  const validation = await validateImageFile(file);
  if (!validation.valid) {
    return { error: validation.error };
  }

  // 4. Upload to Supabase Storage
  const fileName = `${user.id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return { error: 'Bestand kon niet worden geupload' };
  }

  // 5. Get profile_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Profile error:', profileError);
    return { error: 'Profiel niet gevonden' };
  }

  // 6. Create payment request
  const { error: insertError } = await supabase.from('payment_requests').insert({
    profile_id: profile.id,
    subscription_period: subscription_period as SubscriptionPeriod,
    payment_method: 'bank_transfer',
    payment_proof_path: fileName,
    status: 'pending',
    comment: comment || null,
  });

  if (insertError) {
    console.error('Insert error:', insertError);
    return { error: 'Betalingsverzoek kon niet worden aangemaakt' };
  }

  // 7. Revalidate status page
  revalidatePath('/[locale]/subscription/status', 'page');

  return { success: true };
}

/**
 * Request cash payment
 *
 * Flow:
 * 1. Authenticate user
 * 2. Validate subscription period
 * 3. Validate comment is provided (required for cash)
 * 4. Create payment_request record with no file
 *
 * @param formData - Contains subscription_period, comment (required)
 * @returns { success?: boolean; error?: string }
 */
export async function requestCashPayment(formData: FormData) {
  const supabase = await createClient();

  // 1. Authenticate
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'U moet ingelogd zijn om een betalingsverzoek in te dienen' };
  }

  // 2. Extract and validate form data
  const subscription_period = formData.get('subscription_period') as string;
  const comment = formData.get('comment') as string;

  // Validate subscription period
  const validPeriods: SubscriptionPeriod[] = [
    'per_session',
    'per_week',
    'per_month',
    'per_school_year',
  ];
  if (!validPeriods.includes(subscription_period as SubscriptionPeriod)) {
    return { error: 'Ongeldige abonnementsperiode' };
  }

  // 3. Validate comment (required for cash payments)
  if (!comment || comment.trim().length === 0) {
    return { error: 'Vul een toelichting in wanneer en waar u wilt betalen' };
  }

  // 4. Get profile_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Profile error:', profileError);
    return { error: 'Profiel niet gevonden' };
  }

  // 5. Create payment request
  const { error: insertError } = await supabase.from('payment_requests').insert({
    profile_id: profile.id,
    subscription_period: subscription_period as SubscriptionPeriod,
    payment_method: 'cash',
    payment_proof_path: null,
    status: 'pending',
    comment: comment.trim(),
  });

  if (insertError) {
    console.error('Insert error:', insertError);
    return { error: 'Betalingsverzoek kon niet worden aangemaakt' };
  }

  // 6. Revalidate status page
  revalidatePath('/[locale]/subscription/status', 'page');

  return { success: true };
}
