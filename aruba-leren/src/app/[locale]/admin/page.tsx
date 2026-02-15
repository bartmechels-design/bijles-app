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

        {/* Future sections - placeholder cards */}
        <div className="bg-gray-100 rounded-xl p-6 border-l-4 border-gray-300 opacity-50">
          <div className="flex items-center gap-4">
            <div className="bg-gray-200 p-3 rounded-lg">
              <svg
                className="w-8 h-8 text-gray-500"
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
              <h3 className="text-xl font-bold text-gray-600">Gebruikers</h3>
              <p className="text-gray-500 text-sm">Binnenkort beschikbaar</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 rounded-xl p-6 border-l-4 border-gray-300 opacity-50">
          <div className="flex items-center gap-4">
            <div className="bg-gray-200 p-3 rounded-lg">
              <svg
                className="w-8 h-8 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-600">Statistieken</h3>
              <p className="text-gray-500 text-sm">Binnenkort beschikbaar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
