'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface SubscriptionGuardProps {
  children: React.ReactNode
  locale: string
}

export default function SubscriptionGuard({
  children,
  locale,
}: SubscriptionGuardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const t = useTranslations('subscription')
  const supabase = createClient()

  useEffect(() => {
    checkSubscription()
  }, [])

  async function checkSubscription() {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push(`/${locale}/login`)
        return
      }

      // Check if user is admin (admins bypass subscription check)
      const isAdmin = user.app_metadata?.role === 'admin'
      if (isAdmin) {
        setHasAccess(true)
        setIsLoading(false)
        return
      }

      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!profile) {
        setHasAccess(false)
        setIsLoading(false)
        return
      }

      // Check subscription status
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, expires_at')
        .eq('profile_id', profile.id)
        .single()

      // Verify active subscription with valid expiry
      const now = new Date()
      const hasActiveSubscription =
        subscription &&
        subscription.status === 'active' &&
        new Date(subscription.expires_at) > now

      setHasAccess(!!hasActiveSubscription)
      setIsLoading(false)
    } catch (error) {
      console.error('Subscription check error:', error)
      setHasAccess(false)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sky-400 border-t-transparent mb-4"></div>
          <p className="text-gray-600 text-lg">Abonnement controleren...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-amber-500">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-amber-100 p-4 rounded-full">
                <svg
                  className="w-12 h-12 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Actief abonnement vereist
            </h2>

            {/* Message */}
            <p className="text-gray-700 text-center text-lg mb-8">
              U heeft een actief abonnement nodig om ArubaLeren te gebruiken.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/${locale}/subscription/request`}
                className="bg-amber-500 text-white font-bold py-4 px-8 rounded-xl hover:bg-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-300 transition-all text-center"
              >
                Betalingsverzoek indienen
              </Link>
              <Link
                href={`/${locale}/subscription/status`}
                className="bg-sky-500 text-white font-bold py-4 px-8 rounded-xl hover:bg-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-300 transition-all text-center"
              >
                Bekijk abonnementsstatus
              </Link>
            </div>

            {/* Additional Info */}
            <div className="mt-8 bg-sky-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 text-center">
                Na het indienen van een betalingsverzoek, controleren we uw betaling
                en activeren we uw abonnement binnen 24 uur.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
