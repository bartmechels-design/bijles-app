'use client';

import { useState } from 'react';
import { deleteVacation } from '@/lib/vacations/actions';
import VacationForm from './VacationForm';
import type { SchoolVacation } from '@/lib/vacations/utils';

interface VacationManagerProps {
  vacations: SchoolVacation[];
}

export default function VacationManager({ vacations }: VacationManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedVacation, setSelectedVacation] = useState<SchoolVacation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleCloseForm() {
    setShowForm(false);
    setSelectedVacation(null);
  }

  async function handleDelete(vacation: SchoolVacation) {
    if (!window.confirm('Vakantie verwijderen?')) return;

    setDeletingId(vacation.id);
    const result = await deleteVacation(vacation.id);
    setDeletingId(null);

    if ('error' in result) {
      alert(`Fout: ${result.error}`);
    }
  }

  // Collect unique years sorted descending
  const uniqueYears = Array.from(new Set(vacations.map((v) => v.school_year))).sort(
    (a, b) => b.localeCompare(a)
  );

  function formatDate(dateString: string): string {
    const date = new Date(dateString + 'T12:00:00Z');
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  return (
    <div>
      {/* Add button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => {
            setSelectedVacation(null);
            setShowForm(true);
          }}
          className="bg-sky-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors shadow-sm"
        >
          + Vakantie toevoegen
        </button>
      </div>

      {/* Form — shown when adding or editing */}
      {(showForm || selectedVacation !== null) && (
        <VacationForm vacation={selectedVacation} onClose={handleCloseForm} />
      )}

      {/* Vacation list grouped by school year */}
      {vacations.length === 0 ? (
        <p className="text-gray-500 italic text-center py-12">
          Nog geen vakanties ingevoerd. Gebruik de knop hierboven om een vakantie toe te voegen.
        </p>
      ) : (
        <div className="space-y-8">
          {uniqueYears.map((year) => {
            const yearVacations = vacations.filter((v) => v.school_year === year);
            return (
              <div key={year}>
                <h3 className="text-lg font-bold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                  Schooljaar {year}
                </h3>
                <div className="space-y-3">
                  {yearVacations.map((vacation) => (
                    <div
                      key={vacation.id}
                      className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-sky-400 flex items-center justify-between gap-4"
                    >
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">
                            {vacation.name}
                          </span>
                          {vacation.is_public_holiday && (
                            <span className="inline-block bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                              Feestdag
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mt-0.5">
                          {formatDate(vacation.start_date)} t/m {formatDate(vacation.end_date)}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedVacation(vacation);
                            setShowForm(false);
                          }}
                          className="bg-gray-100 text-gray-700 text-sm font-medium py-1.5 px-3 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                        >
                          Bewerken
                        </button>
                        <button
                          onClick={() => handleDelete(vacation)}
                          disabled={deletingId === vacation.id}
                          className="bg-red-100 text-red-700 text-sm font-medium py-1.5 px-3 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === vacation.id ? 'Verwijderen...' : 'Verwijderen'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
