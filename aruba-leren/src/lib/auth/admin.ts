/**
 * Admin Role Utilities
 *
 * Server-only utilities for admin role checking and service role operations
 * IMPORTANT: These functions should only be called from Server Components or Server Actions
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Check if the current authenticated user has admin role
 *
 * @returns true if user is authenticated and has admin role, false otherwise
 *
 * @example
 * // In a Server Component or Server Action
 * const userIsAdmin = await isAdmin();
 * if (!userIsAdmin) {
 *   return redirect('/dashboard');
 * }
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Check app_metadata.role field set via Supabase Dashboard
  const role = user.app_metadata?.role;
  return role === 'admin';
}

/**
 * Create a Supabase client with service role privileges
 *
 * WARNING: This client bypasses Row Level Security (RLS)
 * Only use for admin operations that require elevated privileges
 *
 * @returns Supabase client with service role access
 *
 * @example
 * // Update a payment request status (admin operation)
 * const adminClient = createAdminClient();
 * await adminClient
 *   .from('payment_requests')
 *   .update({ status: 'approved', approved_at: new Date().toISOString() })
 *   .eq('id', requestId);
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)'
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
