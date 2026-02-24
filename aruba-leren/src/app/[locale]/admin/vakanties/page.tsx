import { redirect } from 'next/navigation';
import { isAdmin, createAdminClient } from '@/lib/auth/admin';
import VacationManager from '@/components/admin/VacationManager';
import type { SchoolVacation } from '@/lib/vacations/utils';

export default async function AdminVakantiesPage() {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect('/dashboard');
  }

  // Use admin client to fetch ALL vacations (not just current year)
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('school_vacations')
    .select('*')
    .order('school_year', { ascending: false })
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error fetching vacations for admin:', error);
  }

  const vacations = (data as SchoolVacation[]) ?? [];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Vakantierooster Beheer</h2>
        <p className="text-gray-500 text-sm mt-1">
          Beheer de schoolvakantiedagen die ouders zien in de app
        </p>
      </div>

      <VacationManager vacations={vacations} />
    </div>
  );
}
