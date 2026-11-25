# Steps to Reproduce from Clean Clone

This document describes how to reproduce and verify the out-of-order quote response fix.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL (for the API)

## Clean Clone Setup

```bash
# Clone the repository
git clone <repository-url>
cd micopay-rentas

# Install dependencies
npm install

# Seed the database (creates listings, users, etc.)
npm run seed

# Start the API server
npm run dev:api

# In a separate terminal, start the web server
npm run dev:web
```

The API will run on http://127.0.0.1:8797 and the web app on http://localhost:5190.

## Navigate to a Listing

1. Open http://localhost:5190 in your browser
2. Click on any listing (e.g., "Casa 1")
3. You should see the listing page with date inputs and a quote panel

## Test Scenario 1: Out-of-Order Quote Responses (A → B → A)

**Goal:** Verify that only the latest quote updates the screen when responses arrive out of order.

**Steps:**

1. Open browser DevTools (F12)
2. Go to the Network tab
3. Throttle network to "Slow 3G" (Network throttling dropdown → Slow 3G)
4. On the listing page, observe the initial quote (dates: Nov 28 → Nov 30)
5. Change the check-in date to a date 7 days in the future
6. **Immediately** (within 1 second) change the check-in date again to a date 14 days in the future
7. Wait for the network requests to complete

**Expected behavior:**
- The price/quote is cleared immediately when dates change (no stale price shown)
- The "Book" button is disabled when dates change
- Only the final quote (for the last-selected dates) is displayed
- No intermediate/stale quotes are shown at any point

## Test Scenario 2: B is Unavailable

**Goal:** Verify that an unavailable quote response correctly updates the screen.

**Steps:**

1. Ensure there's a booking that makes certain dates unavailable (run `npm run seed` if needed)
2. With network throttled to "Slow 3G":
3. Select dates that are available (quote shows price, button enabled)
4. **Immediately** change to dates that are already booked (check the "Booked" section for booked ranges)
5. Wait for responses

**Expected behavior:**
- The quote is cleared when dates change
- The unavailable quote response is displayed (showing "Those dates are already booked")
- The "Book" button remains disabled
- The previous available quote is never shown after the change

## Test Scenario 3: B Fails (Error Response)

**Goal:** Verify that an error response correctly updates the screen.

**Steps:**

1. With network throttled to "Slow 3G":
2. Select valid dates (quote shows price)
3. **Immediately** change to invalid dates (e.g., check-out before check-in, or >30 nights)
4. Wait for responses

**Expected behavior:**
- The quote is cleared when dates change
- The error message is displayed
- The "Book" button remains disabled
- The previous successful quote is never shown after the change

## Test Scenario 4: Button Disabled on Date Change

**Goal:** Verify that the button is disabled immediately when dates change.

**Steps:**

1. Wait for the initial quote to load (button becomes enabled)
2. Change any date field (check-in, check-out, or guests)
3. Observe the button state immediately (before any network request completes)

**Expected behavior:**
- Button is disabled immediately when any date changes
- Button remains disabled until new quote arrives and is available
- If new quote shows unavailable, button stays disabled

## Test Scenario 5: Booking Conflict (400 Error)

**Goal:** Verify that a booking conflict shows a clear message.

**Steps:**

1. With the database seeded, note the booked date ranges shown on the listing page
2. Select dates that are currently available
3. Wait for quote to load (button enabled)
4. In a separate terminal, create a booking for those dates via the API:
   ```bash
   curl -X POST http://127.0.0.1:8797/api/bookings \
     -H "Content-Type: application/json" \
     -d '{"listingId":1,"guestId":1,"checkIn":"2026-11-28","checkOut":"2026-11-30","guests":2}'
   ```
5. Click "Book and pay into escrow" on the web page

**Expected behavior:**
- API returns 400 with "Those dates are already booked"
- A clear message is shown: "Those dates are no longer available. Please choose different dates."
- The quote is cleared
- The "Book" button is disabled
- The user can change dates to try again

## Using the Mock API (Optional)

For testing without network throttling, you can use the provided mock:

1. Backup the original file:
   ```bash
   cp apps/web/src/pages/ListingPage.tsx apps/web/src/pages/ListingPage.tsx.backup
   ```

2. Use the mock version:
   ```bash
   cp apps/web/src/pages/__tests__/ListingPageWithMock.tsx apps/web/src/pages/ListingPage.tsx
   ```

3. Refresh the browser and test by rapidly changing dates

4. Restore the original after testing:
   ```bash
   mv apps/web/src/pages/ListingPage.tsx.backup apps/web/src/pages/ListingPage.tsx
   ```

The mock adds incremental delays (0ms, 500ms, 1000ms, ...) to each quote request, simulating out-of-order responses without network throttling.

## Evidence Required

When submitting the PR, include:

1. **Screenshots at 375px width** (mobile view):
   - Initial state with quote loaded
   - After rapid date changes (showing cleared quote)
   - After new quote arrives
   - Booking conflict error message

2. **Screenshots on desktop** (desktop view):
   - Same states as above

3. **360 × 640 keyboard check**:
   - Verify date inputs work correctly on mobile
   - Verify button is tappable (48×48 minimum)
   - Verify focus states are visible

## Cleanup

After testing:

```bash
# Stop the dev servers (Ctrl+C in both terminals)

# If you used the mock, restore the original:
mv apps/web/src/pages/ListingPage.tsx.backup apps/web/src/pages/ListingPage.tsx
```
