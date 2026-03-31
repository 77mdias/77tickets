# Runbook: Checkout Failure

## Overview

This runbook covers the `POST /api/orders` checkout flow — from request ingress through the create-order handler and use-case, to lot/coupon/order repository writes against Neon PostgreSQL — and describes how to diagnose and recover from known failure modes.

---

## Symptom → Cause → Verification → Recovery

### Symptom: Orders return 409 with reason `lot_not_found` or `lot_event_mismatch`

**Probable Cause:** The `lotId` submitted by the client does not exist in the database, or it belongs to a different event than the `eventId` in the request body. This can happen due to stale client state, a UI bug, or a data consistency issue (e.g., lot was deleted after the page loaded).

**Verification:**
```bash
# Search server logs for conflict errors on checkout
# Filter for lot_not_found or lot_event_mismatch reasons
grep '[checkout-observability][use-case]' <worker-log-stream> | \
  jq 'select(.outcome=="failure" and (.errorReason=="lot_not_found" or .errorReason=="lot_event_mismatch"))'

# Confirm the lot exists and belongs to the expected event in Neon DB
# Run via Drizzle console or Neon SQL editor:
SELECT id, event_id, status FROM lots WHERE id = '<lotId>';
```

**Recovery Action:**
1. If the lot does not exist, verify whether it was accidentally deleted or never created. Restore from a backup or re-provision the lot via the admin panel if the deletion was unintended.
2. If the lot exists but belongs to a different event, this is a client bug: the UI submitted an incorrect `eventId`/`lotId` pairing. No server-side data change is needed — investigate the frontend checkout form or API integration for the mismatch.
3. If this error is occurring at volume, check whether a recent deployment changed lot or event IDs (e.g., a data migration ran without updating references).

---

### Symptom: Orders return 409 with reason `out_of_window` or `lot_not_active`

**Probable Cause:** The lot's sale window has not yet opened (`saleStartsAt` is in the future), has already closed (`saleEndsAt` is in the past), or the lot's `status` is not `active`. The domain rule `validateLotForPurchase` enforces these checks server-side.

**Verification:**
```bash
# Check observability logs for out_of_window failures
grep '[checkout-observability][use-case]' <worker-log-stream> | \
  jq 'select(.errorReason=="out_of_window" or .errorReason=="lot_not_active")'

# Verify lot status and sale window in Neon DB:
SELECT id, status, sale_starts_at, sale_ends_at FROM lots WHERE id = '<lotId>';
```

**Recovery Action:**
1. If the sale window is misconfigured (e.g., `saleStartsAt` set to the wrong date), update the lot via the admin panel or directly in Neon. Only do this if it reflects the intended business configuration.
2. If the lot status is not `active`, confirm whether this is intentional (e.g., the organizer paused sales). If accidental, update `status = 'active'` for the lot record through the admin interface.
3. If the Cloudflare Worker's clock is significantly skewed, verify that the `now()` dependency injected into the use-case reflects wall-clock time and is not cached or stale.

---

### Symptom: Orders return 409 with reason `insufficient_stock` or `lot_sold_out`

**Probable Cause:** The lot's `availableQuantity` is less than the quantity requested. Either the lot is genuinely sold out, or there is a concurrency issue where multiple orders were processed simultaneously and stock was over-committed.

**Verification:**
```bash
# Look for a spike in insufficient_stock errors
grep '[checkout-observability][use-case]' <worker-log-stream> | \
  jq 'select(.errorReason=="insufficient_stock")' | \
  jq -s 'group_by(.eventId) | map({eventId: .[0].eventId, count: length})'

# Check available stock for the lot in Neon DB:
SELECT id, available_quantity, max_per_order FROM lots WHERE id = '<lotId>';

# Confirm order count for the lot:
SELECT COUNT(*) FROM order_items WHERE lot_id = '<lotId>';
```

**Recovery Action:**
1. If the lot is genuinely sold out, no action is required — this is expected behavior. Confirm the event page reflects the sold-out status to avoid user confusion.
2. If stock appears inconsistent (DB shows available quantity > 0 but orders are failing), a concurrency issue may have occurred. Audit recent successful orders for the lot by querying `order_items` and reconcile `available_quantity` accordingly.
3. If a stock adjustment is needed (e.g., an event expansion), update `available_quantity` for the lot via the admin interface. Do not update it directly in the database without also validating `order_items` counts.

---

### Symptom: Orders return 409 with reason `invalid_coupon`

**Probable Cause:** The coupon code does not exist for the given event, has expired, has exceeded its usage limit, or is otherwise ineligible. Domain rules in `validateCouponEligibility` enforce these checks.

**Verification:**
```bash
# Filter observability logs for invalid_coupon
grep '[checkout-observability][use-case]' <worker-log-stream> | \
  jq 'select(.errorReason=="invalid_coupon" and .couponApplied==true)'

# Check the coupon record in Neon DB:
SELECT id, code, event_id, valid_from, valid_until, max_redemptions, redemption_count, is_active
FROM coupons WHERE code = '<couponCode>' AND event_id = '<eventId>';
```

**Recovery Action:**
1. If the coupon is expired (`valid_until` is in the past), this is correct behavior. No action required unless the window needs extending — update `valid_until` via the admin panel.
2. If `redemption_count >= max_redemptions`, the coupon is exhausted. If this is unexpected, verify whether `incrementRedemptionCount` was called without a corresponding successful order (e.g., due to a partial failure). Reconcile the count against actual completed orders.
3. If the coupon exists but does not match the `event_id`, the client submitted the wrong coupon scope. No server-side action needed; investigate UI coupon lookup.

---

### Symptom: Orders return 500 (internal error) or fail silently

**Probable Cause:** An unhandled exception occurred, most likely from a Neon PostgreSQL connectivity failure, a Drizzle ORM query error, or an unexpected runtime panic in the Cloudflare Worker.

**Verification:**
```bash
# Check for internal errors in observability logs
grep '[checkout-observability][api]' <worker-log-stream> | \
  jq 'select(.outcome=="failure" and .errorCode=="internal")'

# Check Cloudflare Worker error logs via dashboard or wrangler:
wrangler tail --format=pretty

# Verify Neon DB connectivity:
# Run a lightweight query from the Neon console or a health-check endpoint
SELECT 1;
```

**Recovery Action:**
1. Check the Cloudflare Worker tail logs for the raw stack trace. Internal errors map unknown exceptions using `mapUnknownErrorToAppError` — the original cause is logged at warn level.
2. If Neon is unreachable (connection timeout, TLS error), verify the `DATABASE_URL` secret in the Cloudflare Worker environment. Re-deploy with a corrected secret if needed.
3. If the error is a Drizzle schema mismatch (e.g., after a migration), run pending migrations against Neon and re-deploy the Worker.
4. Escalate if errors persist after connectivity is confirmed — examine the Neon query logs for slow queries or deadlocks.

---

## Monitoring Checklist

- [ ] Check `[checkout-observability][api]` logs for `outcome: "failure"` entries in the current window
- [ ] Check `[checkout-observability][use-case]` logs for `errorReason` breakdown (lot, coupon, stock issues)
- [ ] Check `[audit-trail]` entries to confirm successful orders: `[audit-trail][order.created] {"orderId":"...","customerId":"...","eventId":"...","totalInCents":...,"timestamp":"..."}`
- [ ] Verify Neon DB connectivity and query latency from the Neon console
- [ ] Verify Cloudflare Worker health via the Cloudflare dashboard (CPU time, error rate, request count)
- [ ] Confirm lot `available_quantity` and `status` values are consistent with expected sales volume
- [ ] Confirm coupon `redemption_count` is consistent with actual completed orders

---

## Related Resources

- Error codes: `src/server/application/errors/app-error.types.ts`
- Checkout handler: `src/server/api/create-order.handler.ts`
- Create-order use-case: `src/server/application/use-cases/create-order.use-case.ts`
- Lot domain rules: `src/server/domain/lots/lot.rules.ts`
- Coupon domain rules: `src/server/domain/coupons/coupon.rules.ts`
- Observability implementation: `src/server/infrastructure/observability/checkout-observability.ts`
- Checkout observability guide: `docs/infrastructure/checkout-observability.md`
- Domain rules: `src/server/domain/`
