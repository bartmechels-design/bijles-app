'use client'

import { signIn } from '@/lib/auth/actions'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export default function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations('auth')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    setError(null)

    const result = await signIn(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
    // If no error, redirect() was called in the action
  }

  return (
    <form action={handleSubmit} className="space-y-4 mb-6">
      <input type="hidden" name="locale" value={locale} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {t('email')}
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
          placeholder="ouder@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {t('password')}
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required
          minLength={8}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-sky-600 hover:to-sky-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? t('loading') : t('loginTitle')}
      </button>
    </form>
  )
}
