# Runbook: Check-in Failure

## Overview

This runbook covers the `POST /api/checkin/validate` flow — from the validate-checkin handler through the validate-checkin use-case, to ticket and order repository lookups against Neon PostgreSQL — and describes how to diagnose and recover from known rejection and failure modes.

---

## Symptom → Cause → Verification → Recovery

### Symptom: Check-in returns 404 with reason `ticket_not_found`

**Probable Cause:** The `ticketId` submitted to the endpoint does not exist in the database. This can happen if the QR code scanned is malformed, belongs to a different system, or the ticket was never created (e.g., order creation failed after generating a code client-side).

**Verification:**
```bash
# Search server logs for ticket_not_found rejections
grep 'ticket_not_found' <worker-log-stream>

# Confirm the ticket does not exist in Neon DB:
SELECT id, event_id, order_id, status FROM tickets WHERE id = '<ticketId>';

# Check whether the order that should have produced this ticket exists:
SELECT id, status FROM orders WHERE id = '<orderId>';
```

**Recovery Action:**
1. If the ticket simply does not exist, ask the customer to present their original order confirmation. Look up the order in Neon by `customerId` or `eventId` and retrieve the correct `ticketId`.
2. If the QR code is corrupted or belongs to a different platform, the scan is invalid — reject and instruct the customer to contact support.
3. If an order exists in `paid` status but no corresponding tickets were created, a partial write failure occurred during order creation. Investigate whether the `orderRepository.create` transactional write completed successfully. Restore ticket rows manually only after confirming the order is genuinely paid and no tickets exist.

---

### Symptom: Check-in returns 409 with reason `event_mismatch`

**Probable Cause:** The ticket exists but its `eventId` does not match the `eventId` provided in the check-in request. The checker is attempting to validate a ticket at the wrong event, or the request was built with an incorrect event context.

**Verification:**
```bash
# Search logs for event_mismatch rejections
grep 'event_mismatch' <worker-log-stream>

# Verify ticket and event IDs in Neon DB:
SELECT id, event_id, status FROM tickets WHERE id = '<ticketId>';
SELECT id, name FROM events WHERE id = '<eventId>';
```

**Recovery Action:**
1. Confirm the checker is operating at the correct event. If the checker device was configured with the wrong event context, update the device configuration to use the correct `eventId`.
2. If the ticket genuinely belongs to a different event (e.g., the customer is at the wrong venue), reject the check-in — this is correct behavior. Direct the customer to the appropriate event.
3. If this error is occurring systematically for all tickets at an event, verify the `eventId` being sent in check-in requests from the checker device matches the event in the database.

---

### Symptom: Check-in returns 409 with reason `ticket_used`

**Probable Cause:** The ticket has already been checked in (`status = 'used'`). This can be a legitimate duplicate scan, a fraud attempt, or a race condition where `markAsUsedIfActive` was called concurrently.

**Verification:**
```bash
# Search logs for ticket_used rejections
grep 'ticket_used' <worker-log-stream>

# Check ticket status and check-in timestamp in Neon DB:
SELECT id, status, checked_in_at FROM tickets WHERE id = '<ticketId>';

# Review audit trail for the original check-in:
grep '[audit-trail]' <worker-log-stream> | \
  jq 'select(.ticketId=="<ticketId>")'
```

**Recovery Action:**
1. If the ticket was legitimately used (same person scanning twice), reject and log — this is expected and correct behavior. No recovery action needed.
2. If this is a suspected fraud attempt (ticket code shared with multiple parties), escalate to the event organizer. The `checkedInAt` timestamp in the ticket record identifies when and who performed the first check-in.
3. If this appears to be a concurrency race condition (two devices scanning simultaneously), the `markAsUsedIfActive` optimistic lock will ensure only one succeeds — the second scan receiving `ticket_used` is the correct outcome. No data inconsistency is present.

---

### Symptom: Check-in returns 409 with reason `ticket_cancelled`

**Probable Cause:** The ticket's status is `cancelled`. This occurs when the associated order was cancelled or refunded, invalidating all tickets belonging to it.

**Verification:**
```bash
# Search logs for ticket_cancelled rejections
grep 'ticket_cancelled' <worker-log-stream>

# Verify ticket and order status in Neon DB:
SELECT t.id, t.status, o.id AS order_id, o.status AS order_status
FROM tickets t
JOIN orders o ON t.order_id = o.id
WHERE t.id = '<ticketId>';
```

**Recovery Action:**
1. If the order was intentionally cancelled by the customer or organizer, the ticket cancellation is correct. Reject the check-in and inform the customer.
2. If the order cancellation was accidental or erroneous (e.g., a payment processing error incorrectly marked the order as cancelled), an investigation is needed. Contact the payment provider to confirm the actual payment status before restoring the order to `paid` or issuing a replacement ticket.
3. Do not manually set ticket status back to `active` without first confirming the parent order's status is `paid`.

---

### Symptom: Check-in returns 409 with reason `order_not_eligible`

**Probable Cause:** The ticket exists and its status is `active`, but the associated order is not in `paid` status. Only `paid` orders produce valid active tickets (enforced by `isOrderStatusEligibleForActiveTicket`). The order may be in `pending`, `expired`, or `cancelled` status.

**Verification:**
```bash
# Search logs for order_not_eligible rejections
grep 'order_not_eligible' <worker-log-stream>

# Check the order status for the ticket in Neon DB:
SELECT o.id, o.status, o.created_at
FROM orders o
JOIN tickets t ON t.order_id = o.id
WHERE t.id = '<ticketId>';
```

**Recovery Action:**
1. If the order is `pending` (payment not yet confirmed), the customer has not completed payment. Reject the check-in and direct the customer to complete payment before entry.
2. If the order is `expired`, the payment window passed without confirmation. The ticket is invalid. Reject the check-in.
3. If the order is `paid` but the check-in is still returning `order_not_eligible`, a data inconsistency may exist. Verify that `order.status` in the `orders` table is correctly set to `paid`. If the payment webhook completed but did not transition the order, investigate the order status update pathway.

---

### Symptom: Check-in returns 403 with code `authorization`

**Probable Cause:** The actor's role does not permit check-in operations. Only `admin`, `checker`, and `organizer` (of the specific event) roles are permitted. A `customer` or other unauthorized role attempted to call this endpoint.

**Verification:**
```bash
# Search logs for 403 authorization failures on checkin
grep '[checkout-observability]' <worker-log-stream> | \
  jq 'select(.event=="checkin" and .status==403)'

# Confirm the actor's role in the session/user record:
SELECT id, role FROM users WHERE id = '<actorId>';
```

**Recovery Action:**
1. If the actor is a `customer` attempting to validate their own ticket, this is an invalid operation — check-in is an operator function. No access should be granted.
2. If the actor is an `organizer` who should have access to a specific event, verify that their `userId` matches the event's `organizerId` in the database. If correctly set up, the access check will pass.
3. If this is a misconfigured checker device (wrong session/role), re-authenticate the device with a user account that has the `checker` or `admin` role.

---

## Monitoring Checklist

- [ ] Check server logs for repeated `ticket_not_found` — may indicate QR code generation issues or scan errors
- [ ] Check for a spike in `ticket_used` within short time windows — may indicate ticket code sharing or fraud
- [ ] Check for `order_not_eligible` at high volume — may indicate a payment integration issue failing to transition orders to `paid`
- [ ] Verify Neon DB connectivity is stable during peak check-in periods
- [ ] Confirm `tickets` table `status` values are consistent with their parent `orders.status`
- [ ] Verify checker device sessions are authenticated with the correct role (`checker`, `admin`, or `organizer`)
- [ ] Confirm `assertCheckinAccess` RBAC rules match the expected operator roles for the event

---

## Related Resources

- Error codes: `src/server/application/errors/app-error.types.ts`
- Check-in handler: `src/server/api/checkin/validate-checkin.handler.ts`
- Check-in use-case: `src/server/application/use-cases/validate-checkin.use-case.ts`
- Check-in access policy: `src/server/application/security/checkin-access.policy.ts`
- Order eligibility rules: `src/server/domain/orders/order.rules.ts`
- Ticket domain rules: `src/server/domain/tickets/ticket.rules.ts`
- Domain rules: `src/server/domain/`
