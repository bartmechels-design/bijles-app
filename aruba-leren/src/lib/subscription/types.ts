/**
 * Subscription Types and Constants
 *
 * Defines subscription periods, payment methods, and pricing configuration
 * These types match the database enums in 004_subscriptions_payments.sql
 */

export type SubscriptionPeriod =
  | 'per_session'
  | 'per_week'
  | 'per_month'
  | 'per_school_year';

export type PaymentMethod = 'bank_transfer' | 'cash';

export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

/**
 * Subscription pricing and duration configuration
 * Maps each period to its translation key and duration in days
 */
export const SUBSCRIPTION_PRICES: Record<
  SubscriptionPeriod,
  {
    label_key: string;
    duration_days: number;
  }
> = {
  per_session: {
    label_key: 'payment.perSession',
    duration_days: 1,
  },
  per_week: {
    label_key: 'payment.perWeek',
    duration_days: 7,
  },
  per_month: {
    label_key: 'payment.perMonth',
    duration_days: 30,
  },
  per_school_year: {
    label_key: 'payment.perSchoolYear',
    duration_days: 365,
  },
};

/**
 * Array of subscription period options for form selects
 */
export const SUBSCRIPTION_PERIOD_OPTIONS = Object.keys(
  SUBSCRIPTION_PRICES
) as SubscriptionPeriod[];
