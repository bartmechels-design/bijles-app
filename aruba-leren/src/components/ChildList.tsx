'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { updateChild, deleteChild } from '@/lib/children/actions'

interface Child {
  id: string
  first_name: string
  age: number
  grade: number
}

interface ChildListProps {
  children: Child[]
  locale: string
}

export default function ChildList({ children, locale }: ChildListProps) {
  const t = useTranslations()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleEdit = (childId: string) => {
    setEditingId(childId)
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setError(null)
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>, childId: string) => {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    formData.append('locale', locale)

    const result = await updateChild(childId, formData)

    if (result.error) {
      setError(result.error)
    } else {
      setEditingId(null)
    }
  }

  const handleDelete = async (childId: string, childName: string) => {
    const confirmDelete = window.confirm(
      `${t('common.delete')} ${childName}?`
    )

    if (!confirmDelete) return

    setIsDeleting(childId)
    setError(null)

    const result = await deleteChild(childId, locale)

    setIsDeleting(null)

    if (result.error) {
      setError(result.error)
    }
  }

  if (children.length === 0) {
    return (
      <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-8 text-center">
        <p className="text-gray-600 text-lg">
          Nog geen kinderen toegevoegd
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-sky-700 mb-4">
        {t('parent.children')}
      </h2>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children.map((child) => (
          <div
            key={child.id}
            className="bg-white rounded-2xl shadow-lg p-6 border-2 border-sky-200"
          >
            {editingId === child.id ? (
              // Edit Mode
              <form onSubmit={(e) => handleSave(e, child.id)} className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('child.name')}
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    defaultValue={child.first_name}
                    required
                    className="w-full px-3 py-2 border-2 border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('child.age')}
                  </label>
                  <input
                    type="number"
                    name="age"
                    defaultValue={child.age}
                    min="6"
                    max="12"
                    required
                    className="w-full px-3 py-2 border-2 border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('child.grade')}
                  </label>
                  <select
                    name="grade"
                    defaultValue={child.grade}
                    required
                    className="w-full px-3 py-2 border-2 border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="1">{t('child.gradeOptions.1')}</option>
                    <option value="2">{t('child.gradeOptions.2')}</option>
                    <option value="3">{t('child.gradeOptions.3')}</option>
                    <option value="4">{t('child.gradeOptions.4')}</option>
                    <option value="5">{t('child.gradeOptions.5')}</option>
                    <option value="6">{t('child.gradeOptions.6')}</option>
                  </select>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-sky-400 to-sky-600 text-white font-bold py-2 px-4 rounded-lg hover:from-sky-500 hover:to-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    {t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            ) : (
              // Display Mode
              <div>
                <h3 className="text-xl font-bold text-sky-700 mb-2">
                  {child.first_name}
                </h3>
                <div className="space-y-1 text-gray-600 mb-4">
                  <p>
                    <span className="font-semibold">{t('child.age')}:</span> {child.age}
                  </p>
                  <p>
                    <span className="font-semibold">{t('child.grade')}:</span>{' '}
                    {t(`child.gradeOptions.${child.grade}`)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(child.id)}
                    className="flex-1 bg-amber-400 text-white font-bold py-2 px-4 rounded-lg hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-colors"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(child.id, child.first_name)}
                    disabled={isDeleting === child.id}
                    className="flex-1 bg-red-400 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDeleting === child.id ? t('common.loading') : t('common.delete')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
