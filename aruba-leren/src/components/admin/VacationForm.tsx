'use client';

import { useState, useRef } from 'react';
import { upsertVacation } from '@/lib/vacations/actions';
import { getCurrentSchoolYear } from '@/lib/vacations/utils';
import type { SchoolVacation } from '@/lib/vacations/utils';

interface VacationFormProps {
  vacation?: SchoolVacation | null;
  onClose: () => void;
}

export default function VacationForm({ vacation, onClose }: VacationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isEditing = !!vacation;
  const currentSchoolYear = getCurrentSchoolYear();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await upsertVacation(formData);

    if ('error' in result) {
      setError(result.error);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      onClose();
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        {isEditing ? 'Vakantie bewerken' : 'Nieuwe vakantie toevoegen'}
      </h3>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {/* Hidden id field for editing */}
        {vacation?.id && (
          <input type="hidden" name="id" value={vacation.id} />
        )}

        {/* Name */}
        <div>
          <label
            htmlFor="vacation-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Naam <span className="text-red-500">*</span>
          </label>
          <input
            id="vacation-name"
            type="text"
            name="name"
            required
            defaultValue={vacation?.name ?? ''}
            placeholder="Bijv. Kerstvakantie"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="vacation-start"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Begindatum <span className="text-red-500">*</span>
            </label>
            <input
              id="vacation-start"
              type="date"
              name="start_date"
              required
              defaultValue={vacation?.start_date ?? ''}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="vacation-end"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Einddatum <span className="text-red-500">*</span>
            </label>
            <input
              id="vacation-end"
              type="date"
              name="end_date"
              required
              defaultValue={vacation?.end_date ?? ''}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* School year */}
        <div>
          <label
            htmlFor="vacation-schoolyear"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Schooljaar <span className="text-red-500">*</span>
          </label>
          <input
            id="vacation-schoolyear"
            type="text"
            name="school_year"
            required
            defaultValue={vacation?.school_year ?? currentSchoolYear}
            placeholder="Bijv. 2025-2026"
            pattern="\d{4}-\d{4}"
            title="Format: JJJJ-JJJJ (bijv. 2025-2026)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
          />
        </div>

        {/* Is public holiday */}
        <div className="flex items-center gap-3">
          <input
            id="vacation-holiday"
            type="hidden"
            name="is_public_holiday"
            value="false"
          />
          <input
            id="vacation-holiday-check"
            type="checkbox"
            name="is_public_holiday"
            value="true"
            defaultChecked={vacation?.is_public_holiday ?? false}
            className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-400"
          />
          <label htmlFor="vacation-holiday-check" className="text-sm text-gray-700">
            Dit is een feestdag
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Opslaan...' : isEditing ? 'Bijwerken' : 'Toevoegen'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 transition-colors"
          >
            Annuleren
          </button>
        </div>
      </form>
    </div>
  );
}
