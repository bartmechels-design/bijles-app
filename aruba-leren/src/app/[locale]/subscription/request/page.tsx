import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import PaymentRequestForm from '@/components/PaymentRequestForm';

export default async function PaymentRequestPage() {
  const t = await getTranslations('subscription');
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/nl/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('requestTitle')}
          </h1>
          <p className="text-gray-600">
            Kies een abonnementsperiode en dien uw betaling in
          </p>
        </div>

        <PaymentRequestForm />
      </div>
    </div>
  );
}
