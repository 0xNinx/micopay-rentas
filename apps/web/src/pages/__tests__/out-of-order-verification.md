# Out-of-Order Quote Response Verification

This document describes how to verify that the out-of-order quote response fix works correctly.

## The Fix

The fix uses a request counter (`quoteReqRef`) to ensure only the latest quote response updates the UI:
- Each quote request increments the counter before calling the API
- When a response arrives, it only updates state if its request ID matches the current ref value
- This prevents stale/out-of-order responses from updating the screen

## Test Scenarios

### Scenario 1: A → B → A (out-of-order responses)

**Setup:**
1. Start the dev servers: `npm run dev:api` and `npm run dev:web`
2. Open browser DevTools Network tab
3. Throttle network to "Slow 3G" (simulates delayed responses)

**Steps:**
1. Navigate to a listing page (e.g., http://localhost:5190/listing/casa-1)
2. Note the initial quote for the default dates
3. Change check-in date to a future date (e.g., +7 days)
4. Immediately change check-in date again (e.g., +14 days)
5. Wait for network requests to complete

**Expected behavior:**
- The price/quote is cleared immediately when dates change (before new quote arrives)
- The "Book" button is disabled when dates change
- Only the final quote (for the last-selected dates) is displayed
- No intermediate/stale quotes are shown

### Scenario 2: A → B where B is unavailable

**Setup:**
1. Ensure there's a booking that makes certain dates unavailable
2. Throttle network to "Slow 3G"

**Steps:**
1. Navigate to a listing page
2. Select dates that are available (quote shows price, button enabled)
3. Immediately change to dates that are already booked
4. Wait for responses

**Expected behavior:**
- The quote is cleared when dates change
- The unavailable quote response is displayed (showing "Those dates are already booked")
- The "Book" button remains disabled
- The previous available quote is never shown after the change

### Scenario 3: A → B where B fails

**Setup:**
1. Temporarily modify the API to return an error for specific date ranges
2. Throttle network to "Slow 3G"

**Steps:**
1. Navigate to a listing page
2. Select valid dates (quote shows price)
3. Immediately change to dates that cause an API error
4. Wait for responses

**Expected behavior:**
- The quote is cleared when dates change
- The error message is displayed
- The "Book" button remains disabled
- The previous successful quote is never shown after the change

### Scenario 4: Button disabled on date change

**Steps:**
1. Navigate to a listing page
2. Wait for quote to load (button becomes enabled)
3. Change any date field
4. Observe button state immediately (before new quote arrives)

**Expected behavior:**
- Button is disabled immediately when any date changes
- Button remains disabled until new quote arrives and is available
- If new quote shows unavailable, button stays disabled

### Scenario 5: Booking conflict

**Setup:**
1. Have two browser windows or simulate a race condition
2. Or manually create a booking in the database for specific dates

**Steps:**
1. Navigate to a listing page
2. Select dates that are currently available
3. Wait for quote to load (button enabled)
4. While keeping those dates selected, create a booking for those dates (via API or another session)
5. Click "Book and pay into escrow"

**Expected behavior:**
- API returns 400 with "Those dates are already booked"
- A clear message is shown: "Those dates are no longer available. Please choose different dates."
- The quote is cleared
- The "Book" button is disabled
- The user can change dates to try again

## Automated Test Mock

To test without network throttling, you can temporarily mock the API:

```typescript
// In ListingPage.tsx, temporarily replace api.quote with:
const mockQuote = (listingId: number, checkIn: string, checkOut: string) => {
  const delay = Math.random() * 2000; // Random delay 0-2s
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
    }, delay);
  });
};
```

Then test by rapidly changing dates and observing that only the latest quote is displayed.
