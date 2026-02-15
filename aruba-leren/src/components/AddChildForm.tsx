'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { addChild } from '@/lib/children/actions'

interface AddChildFormProps {
  locale: string
}

export default function AddChildForm({ locale }: AddChildFormProps) {
  const t = useTranslations()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSubmitting(true)

    const form = event.currentTarget
    const formData = new FormData(form)
    formData.append('locale', locale)

    const result = await addChild(formData)

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      form.reset()
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-sky-200">
      <h2 className="text-2xl font-bold text-sky-700 mb-4">
        {t('child.addChild')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Name */}
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            {t('child.name')}
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            required
            className="w-full px-4 py-3 border-2 border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            placeholder={t('child.name')}
          />
        </div>

        {/* Age */}
        <div>
          <label
            htmlFor="age"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            {t('child.age')}
          </label>
          <input
            type="number"
            id="age"
            name="age"
            min="6"
            max="12"
            required
            className="w-full px-4 py-3 border-2 border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            placeholder="8"
          />
        </div>

        {/* Grade */}
        <div>
          <label
            htmlFor="grade"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            {t('child.grade')}
          </label>
          <select
            id="grade"
            name="grade"
            required
            className="w-full px-4 py-3 border-2 border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
          >
            <option value="">-- {t('child.grade')} --</option>
            <option value="1">{t('child.gradeOptions.1')}</option>
            <option value="2">{t('child.gradeOptions.2')}</option>
            <option value="3">{t('child.gradeOptions.3')}</option>
            <option value="4">{t('child.gradeOptions.4')}</option>
            <option value="5">{t('child.gradeOptions.5')}</option>
            <option value="6">{t('child.gradeOptions.6')}</option>
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 text-green-700 text-sm font-semibold">
            {t('common.success')}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-sky-400 to-sky-600 text-white font-bold py-3 px-6 rounded-xl hover:from-sky-500 hover:to-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
        >
          {isSubmitting ? t('common.loading') : t('child.addChild')}
        </button>
      </form>
    </div>
  )
}
