/**
 * Subscription Expiry Calculation
 *
 * Calculates expiration dates for different subscription periods
 * Uses simple date arithmetic (no external dependencies)
 */

import { SUBSCRIPTION_PRICES, type SubscriptionPeriod } from './types';

/**
 * Calculate the expiration date for a subscription period
 *
 * @param period - The subscription period (per_session, per_week, per_month, per_school_year)
 * @param startDate - The start date (defaults to current date/time)
 * @returns The expiration date
 *
 * @example
 * // Calculate when a weekly subscription expires
 * const expiryDate = calculateExpiryDate('per_week');
 *
 * @example
 * // Calculate expiry from a specific start date
 * const expiryDate = calculateExpiryDate('per_month', new Date('2026-02-15'));
 */
export function calculateExpiryDate(
  period: SubscriptionPeriod,
  startDate: Date = new Date()
): Date {
  const config = SUBSCRIPTION_PRICES[period];
  const durationMs = config.duration_days * 24 * 60 * 60 * 1000;

  return new Date(startDate.getTime() + durationMs);
}
