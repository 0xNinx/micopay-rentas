/**
 * Mock API for testing out-of-order quote responses.
 *
 * This file provides a mock implementation of the quote API that simulates
 * out-of-order responses with configurable delays.
 *
 * USAGE:
 * 1. In ListingPage.tsx, temporarily import this mock
 * 2. Replace `api.quote` with `mockQuote` or `createOutOfOrderMock()`
 * 3. Test by rapidly changing dates
 * 4. Revert changes after testing
 */

import type { Quote } from '../../api';

export interface MockQuoteOptions {
  baseDelay?: number;
  delayIncrement?: number;
  unavailableForDates?: { checkIn: string; checkOut: string }[];
  errorForDates?: { checkIn: string; checkOut: string }[];
}

/**
 * Creates a mock quote function that simulates out-of-order responses.
 * Each call gets an incrementally longer delay, simulating network lag.
 */
export function createOutOfOrderMock(options: MockQuoteOptions = {}) {
  const {
    baseDelay = 0,
    delayIncrement = 500,
    unavailableForDates = [],
    errorForDates = [],
  } = options;

  let callCount = 0;

  return (listingId: number, checkIn: string, checkOut: string): Promise<Quote> => {
    const delay = baseDelay + (callCount++ * delayIncrement);

    // Check if this date range should be unavailable
    const isUnavailable = unavailableForDates.some(
      (d) => d.checkIn === checkIn && d.checkOut === checkOut
    );

    // Check if this date range should error
    const shouldError = errorForDates.some(
      (d) => d.checkIn === checkIn && d.checkOut === checkOut
    );

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldError) {
          reject(new Error('API error for these dates'));
        } else {
          resolve({
            nights: 2,
            nightly: '1000',
            stay: '2000',
            cleaning: '500',
            subtotal: '2500',
            fee: '250',
            deposit: '1000',
            total: '3750',
            feeRate: '0.1',
            available: !isUnavailable,
            fx: { rate: '20' },
          });
        }
      }, delay);
    });
  };
}

/**
 * Pre-configured mock for scenario A → B → A
 * Simulates responses arriving out of order.
 */
export const mockScenarioABA = createOutOfOrderMock({
  baseDelay: 0,
  delayIncrement: 500,
});

/**
 * Pre-configured mock for scenario A → B where B is unavailable
 */
export const mockScenarioBUnavailable = createOutOfOrderMock({
  baseDelay: 0,
  delayIncrement: 500,
  unavailableForDates: [
    // Add specific dates that should be unavailable
    // { checkIn: '2026-11-30', checkOut: '2026-12-02' },
  ],
});

/**
 * Pre-configured mock for scenario A → B where B fails
 */
export const mockScenarioBError = createOutOfOrderMock({
  baseDelay: 0,
  delayIncrement: 500,
  errorForDates: [
    // Add specific dates that should error
    // { checkIn: '2026-11-30', checkOut: '2026-12-02' },
  ],
});

/**
 * Simple mock with fixed delay for basic testing
 */
export function mockQuote(listingId: number, checkIn: string, checkOut: string): Promise<Quote> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        nights: 2,
        nightly: '1000',
        stay: '2000',
        cleaning: '500',
        subtotal: '2500',
        fee: '250',
        deposit: '1000',
        total: '3750',
        feeRate: '0.1',
        available: true,
        fx: { rate: '20' },
      });
    }, 500);
  });
}
