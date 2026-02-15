import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function SubscriptionStatusPage() {
  const t = await getTranslations('subscription');
  const tPayment = await getTranslations('payment');
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/nl/login');
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    redirect('/nl/login');
  }

  // Get current subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .single();

  // Get payment request history
  const { data: paymentRequests } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      expired: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
          colors[status as keyof typeof colors] || colors.pending
        }`}
      >
        {t(`status.${status}`)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('statusTitle')}
          </h1>
        </div>

        {/* Current Subscription Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Huidig abonnement
          </h2>
          {subscription ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                {getStatusBadge(subscription.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Periode:</span>
                <span className="font-semibold text-gray-900">
                  {tPayment(subscription.subscription_period)}
                </span>
              </div>
              {subscription.expires_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('activeUntil')}:</span>
                  <span className="font-semibold text-gray-900">
                    {formatDate(subscription.expires_at)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">{t('noSubscription')}</p>
              <Link
                href="/nl/subscription/request"
                className="inline-block bg-sky-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-sky-700 transition"
              >
                {t('requestNew')}
              </Link>
            </div>
          )}
        </div>

        {/* Payment Request History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('requestHistory')}
          </h2>
          {paymentRequests && paymentRequests.length > 0 ? (
            <div className="space-y-4">
              {paymentRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {tPayment(request.subscription_period)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      {request.payment_method === 'bank_transfer' ? (
                        <>
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                          </svg>
                          Bankovermaking
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4 mr-1"
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
                          Contant
                        </>
                      )}
                    </span>
                  </div>
                  {request.comment && (
                    <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                      {request.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">{t('noRequests')}</p>
              <Link
                href="/nl/subscription/request"
                className="inline-block bg-sky-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-sky-700 transition"
              >
                {t('requestNew')}
              </Link>
            </div>
          )}
        </div>

        {/* Action Button */}
        {subscription && (
          <div className="mt-8 text-center">
            <Link
              href="/nl/subscription/request"
              className="inline-block bg-white text-sky-600 border-2 border-sky-600 px-6 py-3 rounded-lg font-medium hover:bg-sky-50 transition"
            >
              {t('requestNew')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
