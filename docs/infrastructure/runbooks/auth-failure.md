# Runbook: Auth Failure

## Overview

This runbook covers authentication and authorization failures across the platform — from session resolution via `getSession()` returning null/expired (401), to RBAC enforcement in handlers returning forbidden (403) — and describes how to diagnose and recover from known auth failure modes.

---

## Symptom → Cause → Verification → Recovery

### Symptom: All protected endpoints return 401 with code `unauthenticated`

**Probable Cause:** The session cookie is missing, invalid, or expired. `createGetSession` calls `resolveSession(request)` and throws `createUnauthenticatedError` when the result is null. This can indicate a session expiry, a cookie misconfiguration, or a deployment that invalidated existing sessions (e.g., auth secret rotation).

**Verification:**
```bash
# Check for a spike in 401 responses across all routes
grep '"code":"unauthenticated"' <worker-log-stream> | \
  jq -s 'length'

# Confirm whether the issue is user-scoped or platform-wide:
# - Single user → likely expired session or cookie issue
# - All users simultaneously → likely a deployment or secret rotation event

# Check Cloudflare Worker environment for the auth secret:
wrangler secret list

# Verify the NEXT_PUBLIC_APP_URL matches the deployment origin
# (auth.client.ts baseURL must match the origin setting cookies)
```

**Recovery Action:**
1. If the issue affects a single user: instruct them to sign out and sign back in. The session cookie will be re-issued on login.
2. If the issue affects all users after a deployment: verify whether the auth session secret was rotated. If the secret changed, all existing sessions are invalidated — this is expected. Users must re-authenticate.
3. If `NEXT_PUBLIC_APP_URL` does not match the actual deployment domain (e.g., after moving to a new Cloudflare Pages URL), the auth client's `baseURL` will be wrong and session cookies may not be sent. Update the environment variable and redeploy.
4. If sessions are expiring faster than expected, verify the session TTL configuration in the auth provider settings. The platform uses `better-auth` — check its session configuration for `expiresIn`.

---

### Symptom: Protected endpoints return 401 intermittently for valid users

**Probable Cause:** Cookie-based sessions may not be forwarded correctly to the Cloudflare Worker on certain requests — particularly cross-origin requests where `SameSite` or `Secure` cookie attributes are not met, or when the `Authorization` header is stripped by an intermediary.

**Verification:**
```bash
# Check for intermittent 401 patterns (same user, some requests succeed)
grep '"code":"unauthenticated"' <worker-log-stream> | \
  jq '{timestamp: .timestamp, path: .path}' | head -50

# Verify request headers being received by the Worker:
# Enable Cloudflare Worker debug logging temporarily to inspect incoming cookies/headers

# Confirm cookie attributes in the browser dev tools:
# - Secure: true (required on HTTPS)
# - SameSite: must be compatible with the request origin
# - Domain: must match the deployment domain
```

**Recovery Action:**
1. If requests are cross-origin (e.g., a mobile app or third-party integration calling the API), verify that the auth cookie is included with `credentials: 'include'` in fetch calls, and that CORS is configured to allow the origin with credentials.
2. If the cookie is `SameSite=Strict` and requests originate from a different subdomain or context, relax to `SameSite=Lax` in the auth configuration if appropriate.
3. If the Cloudflare Worker is deployed behind a proxy that strips `Cookie` headers, configure the proxy to forward them.

---

### Symptom: Checkout (`POST /api/orders`) returns 403 with code `authorization`

**Probable Cause:** The authenticated actor does not have permission to create an order on behalf of the specified `customerId`. The `assertCreateOrderAccess` policy allows only `admin` roles and `customer` roles where `actor.userId === targetCustomerId`. Any other role combination (e.g., `organizer`, `checker`, or a customer ordering for a different customer) is rejected.

**Verification:**
```bash
# Check for authorization failures on checkout
grep '[checkout-observability][api]' <worker-log-stream> | \
  jq 'select(.outcome=="failure" and .errorCode=="authorization")'

# Confirm the actor's role and the targetCustomerId in the request:
# The audit logger emits an entry for unauthorized checkout attempts:
grep '[audit-trail]' <worker-log-stream> | \
  jq 'select(.actorRole != null and .targetCustomerId != null)'

# Verify the user's role in Neon DB:
SELECT id, role FROM users WHERE id = '<actorId>';
```

**Recovery Action:**
1. If a `customer` is ordering for themselves but the `customerId` in the request body differs from their `userId`, this is a client bug — the checkout form is sending the wrong `customerId`. Investigate the frontend `checkout-client.ts` to ensure `customerId` is derived from the authenticated session.
2. If an `organizer` or `checker` is attempting to place an order, this is an invalid operation — those roles are not permitted to purchase tickets. No access should be granted.
3. A sustained spike in `authorization` errors on checkout may indicate an integration issue or abuse attempt. Review the audit trail entries (emitted by `logUnauthorizedCreateOrderAttempt`) for the `actorId` and `targetCustomerId` patterns.

---

### Symptom: Check-in (`POST /api/checkin/validate`) returns 403 with code `authorization`

**Probable Cause:** The authenticated actor's role is not permitted to perform check-ins. The `assertCheckinAccess` policy grants access only to `admin`, `checker`, and `organizer` roles (organizers only for their own events). A `customer` or an `organizer` for a different event will receive a 403.

**Verification:**
```bash
# Check for authorization failures on checkin
grep '"code":"authorization"' <worker-log-stream> | \
  jq 'select(.path=="/api/checkin/validate")'

# Confirm the actor's role and the event's organizerId:
SELECT u.id, u.role FROM users u WHERE u.id = '<actorId>';
SELECT id, organizer_id FROM events WHERE id = '<eventId>';
```

**Recovery Action:**
1. If a `customer` is attempting to scan tickets, reject — this is an invalid operation. Checker devices must be authenticated with a `checker`, `organizer`, or `admin` account.
2. If an `organizer` is receiving 403 on their own event, verify that the event's `organizerId` in Neon matches their `userId` in the session. If the event was transferred or created with a different organizer ID, update the event record via the admin interface.
3. If checker devices are authenticated with a generic account, ensure that account has the `checker` role in the `users` table. Update via admin panel if needed.

---

### Symptom: User role is defaulting to `customer` unexpectedly

**Probable Cause:** `createGetSession` falls back to `role: "customer"` when `session.user.role` is not one of the known roles (`customer`, `organizer`, `admin`, `checker`). If a user's role was set to a non-standard value (e.g., a typo during provisioning), they will silently be treated as a `customer`.

**Verification:**
```bash
# Identify users whose role may not be recognized by the platform:
SELECT id, role FROM users WHERE role NOT IN ('customer', 'organizer', 'admin', 'checker');

# Confirm the session payload being returned by the auth provider includes role:
# Check the auth provider's user session shape — the platform reads session.user.role
```

**Recovery Action:**
1. If a user needs `organizer`, `admin`, or `checker` access, update their `role` in the `users` table via the admin interface to one of the recognized values.
2. If the auth provider is not including `role` in the session payload (returns undefined), verify the auth provider session configuration to ensure the `role` field is included in the session user object. Without it, all users default to `customer`.
3. After correcting the role, instruct the affected user to sign out and back in to receive a fresh session with the correct role.

---

## Monitoring Checklist

- [ ] Check server logs for a volume spike in `401 unauthenticated` responses — may indicate session invalidation or deployment-related cookie issues
- [ ] Check server logs for a volume spike in `403 authorization` responses on checkout — may indicate client-side session/customerId mismatch or abuse
- [ ] Confirm Cloudflare Worker secrets include the auth provider secret and `NEXT_PUBLIC_APP_URL` is correct for the deployment domain
- [ ] Verify cookie attributes (`Secure`, `SameSite`, `Domain`) are appropriate for the deployment environment
- [ ] Confirm checker and organizer accounts have the correct `role` values in Neon DB
- [ ] Review audit trail entries (`[audit-trail]`) for unauthorized checkout attempt patterns
- [ ] After any auth secret rotation or deployment change, confirm users can successfully authenticate

---

## Related Resources

- Error codes: `src/server/application/errors/app-error.types.ts`
- Session resolution: `src/server/api/auth/get-session.ts`
- Auth client: `src/server/infrastructure/auth/auth.client.ts`
- Create-order access policy: `src/server/application/security/create-order.policy.ts`
- Check-in access policy: `src/server/application/security/checkin-access.policy.ts`
- Security types and roles: `src/server/application/security/security.types.ts`
- Domain rules: `src/server/domain/`
