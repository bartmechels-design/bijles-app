'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import FileUpload from './FileUpload';
import { uploadPaymentProof, requestCashPayment } from '@/app/[locale]/subscription/request/actions';
import type { SubscriptionPeriod } from '@/lib/subscription/types';

const PERIODS: SubscriptionPeriod[] = [
  'per_session',
  'per_week',
  'per_month',
  'per_school_year',
];

type PaymentMethod = 'bank_transfer' | 'cash';

export default function PaymentRequestForm() {
  const t = useTranslations('subscription');
  const tPayment = useTranslations('payment');
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPeriod, setSelectedPeriod] = useState<SubscriptionPeriod | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const handlePeriodSelect = (period: SubscriptionPeriod) => {
    setSelectedPeriod(period);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriod) return;

    setError('');
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('subscription_period', selectedPeriod);
      formData.append('comment', comment);

      let result;

      if (paymentMethod === 'bank_transfer') {
        if (!selectedFile) {
          setError(t('errors.uploadFailed'));
          setIsSubmitting(false);
          return;
        }
        formData.append('payment_proof', selectedFile);
        result = await uploadPaymentProof(formData);
      } else {
        if (!comment.trim()) {
          setError(t('errors.commentRequired'));
          setIsSubmitting(false);
          return;
        }
        result = await requestCashPayment(formData);
      }

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
      } else if (result.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(t('errors.submitFailed'));
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('successTitle')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('successMessage')}
        </p>
        <button
          onClick={() => router.push('/nl/subscription/status')}
          className="bg-sky-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-sky-700 transition"
        >
          {t('viewStatus')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      {/* Step 1: Period Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('selectPeriod')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => handlePeriodSelect(period)}
                className="p-6 border-2 border-sky-200 rounded-lg text-left hover:border-sky-500 hover:bg-sky-50 transition cursor-pointer"
              >
                <span className="text-lg font-semibold text-gray-900">
                  {tPayment(period)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Payment Method and Details */}
      {step === 2 && selectedPeriod && (
        <div className="space-y-6">
          <div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sky-600 hover:text-sky-700 text-sm font-medium mb-4 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar periodes
            </button>
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">Gekozen periode:</p>
              <p className="text-lg font-bold text-sky-900">{tPayment(selectedPeriod)}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              {t('selectMethod')}
            </h3>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`flex-1 p-4 border-2 rounded-lg font-medium transition ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-sky-500 bg-sky-50 text-sky-900'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('bankTransfer')}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex-1 p-4 border-2 rounded-lg font-medium transition ${
                  paymentMethod === 'cash'
                    ? 'border-sky-500 bg-sky-50 text-sky-900'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('cash')}
              </button>
            </div>
          </div>

          {/* Bank Transfer: File Upload + Optional Comment */}
          {paymentMethod === 'bank_transfer' && (
            <div className="space-y-4">
              <FileUpload onFileSelect={setSelectedFile} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('commentOptional')}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Bijv. betaling gedaan op 15 februari"
                />
              </div>
            </div>
          )}

          {/* Cash: Required Comment */}
          {paymentMethod === 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('commentLabel')} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder={t('commentPlaceholder')}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-sky-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-sky-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('submitting')}
              </>
            ) : (
              t('submit')
            )}
          </button>
        </div>
      )}
    </form>
  );
}
