'use client'

import { useState } from 'react'
import { approvePaymentRequest, rejectPaymentRequest } from '@/app/[locale]/admin/payments/actions'

interface PaymentRequestCardProps {
  request: {
    id: string
    profile_id: string
    subscription_period: string
    payment_method: string
    payment_proof_path: string | null
    comment: string | null
    created_at: string
    status: string
  }
  profileName: string
  signedUrl: string | null
}

export default function PaymentRequestCard({
  request,
  profileName,
  signedUrl,
}: PaymentRequestCardProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const periodLabels: Record<string, string> = {
    per_session: 'Per keer',
    per_week: 'Per week',
    per_month: 'Per maand',
    per_school_year: 'Per schooljaar',
  }

  const methodLabels: Record<string, string> = {
    bank_transfer: 'Bankoverschrijving',
    cash: 'Contant',
  }

  const handleApprove = async () => {
    setIsApproving(true)
    setError(null)

    const formData = new FormData()
    formData.append('requestId', request.id)

    const result = await approvePaymentRequest(formData)

    if (result.error) {
      setError(result.error)
      setIsApproving(false)
    }
    // If success, page will revalidate and card will disappear
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Vul een reden in')
      return
    }

    setIsRejecting(true)
    setError(null)

    const formData = new FormData()
    formData.append('requestId', request.id)
    formData.append('reason', rejectReason)

    const result = await rejectPaymentRequest(formData)

    if (result.error) {
      setError(result.error)
      setIsRejecting(false)
    }
    // If success, page will revalidate and card will disappear
  }

  const formattedDate = new Date(request.created_at).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-white rounded-xl shadow-md border-l-4 border-amber-500 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{profileName}</h3>
          <p className="text-sm text-gray-500">{formattedDate}</p>
        </div>
        <div className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full">
          In behandeling
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 font-medium">Abonnement:</span>
          <span className="text-gray-900">
            {periodLabels[request.subscription_period] || request.subscription_period}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-600 font-medium">Betaalmethode:</span>
          <span className="bg-sky-100 text-sky-800 text-sm font-medium px-3 py-1 rounded-full">
            {methodLabels[request.payment_method] || request.payment_method}
          </span>
        </div>

        {request.comment && (
          <div>
            <span className="text-gray-600 font-medium">Opmerking:</span>
            <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg">
              {request.comment}
            </p>
          </div>
        )}

        {/* Payment Proof Image */}
        {request.payment_method === 'bank_transfer' && signedUrl && (
          <div>
            <span className="text-gray-600 font-medium">Betalingsbewijs:</span>
            <div className="mt-2">
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <img
                  src={signedUrl}
                  alt="Betalingsbewijs"
                  className="max-w-full h-auto rounded-lg border-2 border-gray-200 hover:border-sky-400 transition-colors cursor-pointer max-h-64 object-contain"
                />
              </a>
              <p className="text-xs text-gray-500 mt-1">
                Klik op de afbeelding om te vergroten
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Actions */}
      {!showRejectForm ? (
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="flex-1 bg-green-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-green-300 transition-all"
          >
            {isApproving ? 'Goedkeuren...' : 'Goedkeuren'}
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={isApproving}
            className="flex-1 bg-red-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-red-300 transition-all"
          >
            Afwijzen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reden voor afwijzing:
            </label>
            <textarea
              id="reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Bijvoorbeeld: Betalingsbewijs niet duidelijk leesbaar"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={isRejecting}
              className="flex-1 bg-red-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-red-300 transition-all"
            >
              {isRejecting ? 'Afwijzen...' : 'Bevestig afwijzing'}
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false)
                setRejectReason('')
                setError(null)
              }}
              disabled={isRejecting}
              className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
