import Link from 'next/link'

interface AdminPageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-8">
        Admin Dashboard
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Payment Requests Card */}
        <Link
          href={`/${locale}/admin/payments`}
          className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-amber-500"
        >
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-lg">
              <svg
                className="w-8 h-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Betalingen</h3>
              <p className="text-gray-600 text-sm">
                Betalingsverzoeken beheren
              </p>
            </div>
          </div>
        </Link>

        {/* Leerstof Card */}
        <Link href={`/${locale}/admin/leerstof`} className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Leerstof</h3>
              <p className="text-gray-600 text-sm">Leerstof uploaden voor zaakvakken</p>
            </div>
          </div>
        </Link>

        {/* Gebruikers Card */}
        <Link
          href={`/${locale}/admin/gebruikers`}
          className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-sky-500"
        >
          <div className="flex items-center gap-4">
            <div className="bg-sky-100 p-3 rounded-lg">
              <svg
                className="w-8 h-8 text-sky-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Gebruikers</h3>
              <p className="text-gray-600 text-sm">Families en kinderen beheren</p>
            </div>
          </div>
        </Link>

        {/* Vakanties Card */}
        <Link
          href={`/${locale}/admin/vakanties`}
          className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-purple-500"
        >
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Vakanties</h3>
              <p className="text-gray-600 text-sm">Schoolvakanties beheren</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
