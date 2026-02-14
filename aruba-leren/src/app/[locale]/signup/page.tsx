import { getTranslations } from 'next-intl/server'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { Link } from '@/i18n/navigation'
import SignupForm from './SignupForm'

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('signupTitle')}
            </h1>
            <p className="text-gray-600">
              {t('hasAccount')}{' '}
              <Link
                href="/login"
                className="text-sky-600 hover:text-sky-700 font-medium"
              >
                {t('loginTitle')}
              </Link>
            </p>
          </div>

          {/* Email/Password Form */}
          <SignupForm locale={locale} />

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                {t('orContinueWith')}
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <OAuthButtons />
        </div>
      </div>
    </div>
  )
}
