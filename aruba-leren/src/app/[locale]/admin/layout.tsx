import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth/admin'
import Link from 'next/link'

interface AdminLayoutProps {
  children: React.ReactNode
  params: Promise<{
    locale: string
  }>
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params

  // Check if current user has admin role
  const userIsAdmin = await isAdmin()

  if (!userIsAdmin) {
    redirect(`/${locale}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <p className="text-gray-400 text-sm">ArubaLeren Beheer</p>
            </div>

            {/* Navigation */}
            <nav className="flex gap-4">
              <Link
                href={`/${locale}/admin`}
                className="px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href={`/${locale}/admin/payments`}
                className="px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Betalingen
              </Link>
              <Link
                href={`/${locale}/dashboard`}
                className="px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-gray-300"
              >
                Terug naar Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
