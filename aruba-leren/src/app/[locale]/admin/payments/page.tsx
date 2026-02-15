import { isAdmin, createAdminClient } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import PaymentRequestCard from '@/components/PaymentRequestCard'

interface AdminPaymentsPageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function AdminPaymentsPage({ params }: AdminPaymentsPageProps) {
  const { locale } = await params

  // Defense-in-depth: check admin role (layout also checks)
  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) {
    redirect(`/${locale}`)
  }

  // Create admin client with service role
  const adminClient = createAdminClient()

  // Query all pending payment requests with profile info
  const { data: requests, error } = await adminClient
    .from('payment_requests')
    .select('*, profiles(id, display_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Payment requests fetch error:', error)
  }

  // Generate signed URLs for payment proof images
  const requestsWithSignedUrls = await Promise.all(
    (requests || []).map(async (request) => {
      let signedUrl = null

      if (request.payment_proof_path) {
        try {
          const { data: urlData } = await adminClient.storage
            .from('payment-proofs')
            .createSignedUrl(request.payment_proof_path, 3600) // 1 hour expiry

          signedUrl = urlData?.signedUrl || null
        } catch (err) {
          console.error('Error generating signed URL:', err)
        }
      }

      return {
        ...request,
        signedUrl,
      }
    })
  )

  const pendingCount = requestsWithSignedUrls.length

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Betalingsverzoeken
        </h2>
        <p className="text-gray-600">
          {pendingCount === 0 ? (
            'Geen openstaande verzoeken'
          ) : pendingCount === 1 ? (
            '1 openstaand verzoek'
          ) : (
            `${pendingCount} openstaande verzoeken`
          )}
        </p>
      </div>

      {/* Payment Requests List */}
      {pendingCount === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            Alles verwerkt!
          </h3>
          <p className="text-gray-600">
            Er zijn momenteel geen openstaande betalingsverzoeken.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {requestsWithSignedUrls.map((request) => (
            <PaymentRequestCard
              key={request.id}
              request={request}
              profileName={
                (request.profiles as any)?.display_name || 'Onbekende gebruiker'
              }
              signedUrl={request.signedUrl}
            />
          ))}
        </div>
      )}
    </div>
  )
}
