import { isAdmin, createAdminClient } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import LeerstofUpload from '@/components/admin/LeerstofUpload'

interface LeerstofPageProps {
  params: Promise<{ locale: string }>
}

const SUBJECT_LABELS: Record<string, string> = {
  geschiedenis: 'Geschiedenis',
  aardrijkskunde: 'Aardrijkskunde',
  kennis_der_natuur: 'Kennis der Natuur',
}

export default async function LeerstofPage({ params }: LeerstofPageProps) {
  const { locale } = await params

  // Defense-in-depth admin check (layout also checks)
  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) {
    redirect(`/${locale}`)
  }

  const adminClient = createAdminClient()

  // Fetch all leerstof items ordered by most recent first
  const { data: items, error } = await adminClient
    .from('leerstof_items')
    .select('id, subject, title, source_type, source_filename, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Leerstof fetch error:', error)
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Leerstof Beheer</h2>

      <LeerstofUpload locale={locale} />

      {/* Existing items */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Geüploade leerstof</h3>
        </div>

        {!items || items.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nog geen leerstof geüpload.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vak</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Titel</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Datum</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {SUBJECT_LABELS[item.subject] ?? item.subject}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.source_type === 'pdf' ? 'PDF' : 'Tekst'}
                    {item.source_filename && (
                      <span className="ml-1 text-xs text-gray-400">({item.source_filename})</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.is_active ? 'Actief' : 'Inactief'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString('nl-NL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
