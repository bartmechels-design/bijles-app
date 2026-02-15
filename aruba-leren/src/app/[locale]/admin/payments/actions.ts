'use server'

import { isAdmin, createAdminClient } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { calculateExpiryDate } from '@/lib/subscription/check'
import { revalidatePath } from 'next/cache'
import type { SubscriptionPeriod } from '@/lib/subscription/types'

/**
 * Approve a payment request and create/update subscription
 *
 * @param formData - Form data containing requestId
 * @returns Success status or error message
 */
export async function approvePaymentRequest(formData: FormData) {
  // Check admin authorization
  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) {
    return { error: 'Niet geautoriseerd' }
  }

  const requestId = formData.get('requestId') as string
  if (!requestId) {
    return { error: 'Verzoek ID ontbreekt' }
  }

  try {
    // Create admin client with service role
    const adminClient = createAdminClient()

    // Fetch payment request
    const { data: request, error: fetchError } = await adminClient
      .from('payment_requests')
      .select('*, profiles(id)')
      .eq('id', requestId)
      .single()

    if (fetchError || !request) {
      return { error: 'Betalingsverzoek niet gevonden' }
    }

    if (request.status !== 'pending') {
      return { error: 'Dit verzoek is al verwerkt' }
    }

    // Calculate expiry date based on subscription period
    const expiryDate = calculateExpiryDate(request.subscription_period as SubscriptionPeriod)

    // Get current admin user ID for audit trail
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminUserId = user?.id

    // Upsert subscription (creates new or updates existing)
    const { error: subscriptionError } = await adminClient
      .from('subscriptions')
      .upsert(
        {
          profile_id: request.profile_id,
          status: 'active',
          period: request.subscription_period,
          expires_at: expiryDate.toISOString(),
          last_payment_request_id: requestId,
        },
        {
          onConflict: 'profile_id',
        }
      )

    if (subscriptionError) {
      console.error('Subscription upsert error:', subscriptionError)
      return { error: 'Fout bij aanmaken abonnement' }
    }

    // Update payment request status
    const { error: updateError } = await adminClient
      .from('payment_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by_user_id: adminUserId,
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Payment request update error:', updateError)
      return { error: 'Fout bij bijwerken betalingsverzoek' }
    }

    // Revalidate the payments page
    revalidatePath('/admin/payments')

    return { success: true }
  } catch (error) {
    console.error('Approve payment error:', error)
    return { error: 'Er is een fout opgetreden' }
  }
}

/**
 * Reject a payment request with a reason
 *
 * @param formData - Form data containing requestId and reason
 * @returns Success status or error message
 */
export async function rejectPaymentRequest(formData: FormData) {
  // Check admin authorization
  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) {
    return { error: 'Niet geautoriseerd' }
  }

  const requestId = formData.get('requestId') as string
  const reason = formData.get('reason') as string

  if (!requestId) {
    return { error: 'Verzoek ID ontbreekt' }
  }

  if (!reason || reason.trim().length === 0) {
    return { error: 'Reden is verplicht' }
  }

  try {
    // Create admin client with service role
    const adminClient = createAdminClient()

    // Update payment request status
    const { error: updateError } = await adminClient
      .from('payment_requests')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_reason: reason.trim(),
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Payment request rejection error:', updateError)
      return { error: 'Fout bij afwijzen betalingsverzoek' }
    }

    // Revalidate the payments page
    revalidatePath('/admin/payments')

    return { success: true }
  } catch (error) {
    console.error('Reject payment error:', error)
    return { error: 'Er is een fout opgetreden' }
  }
}
