/**
 * Smoke script: checkin-flow
 *
 * Prerequisites:
 *   - NestJS running at SMOKE_BASE_URL (default: http://localhost:3001)
 *   - SMOKE_TICKET_ID: valid active ticket ID to check in
 *   - SMOKE_EVENT_ID: event ID for the ticket
 *   - SMOKE_CHECKER_COOKIE: session cookie for a user with checker/admin role
 *
 * Exit 0: flow succeeded
 * Exit 1: flow failed (with descriptive message)
 */

import { apiCall, checkServer, fail, log, BASE_URL } from "./helpers/http";

interface CheckinPayload {
  data?: {
    ticketId?: string;
    eventId?: string;
    checkerId?: string;
    validatedAt?: string;
  };
  error?: { code?: string; message?: string };
}

async function run(): Promise<void> {
  log(`Starting checkin-flow against ${BASE_URL}`);

  await checkServer();
  log("Server reachable.");

  const ticketId = process.env.SMOKE_TICKET_ID;
  const eventId = process.env.SMOKE_EVENT_ID;
  const checkerCookie = process.env.SMOKE_CHECKER_COOKIE;

  if (!ticketId || !eventId || !checkerCookie) {
    log(
      "SMOKE_TICKET_ID, SMOKE_EVENT_ID, or SMOKE_CHECKER_COOKIE not set. " +
        "These are required to exercise the check-in flow. " +
        "Run purchase-flow first to get a ticket ID and event ID.",
    );
    log("checkin-flow SKIP (missing environment variables).");
    return;
  }

  // Step 1: Perform check-in
  const checkinResponse = await apiCall<CheckinPayload>("/api/checkin", {
    method: "POST",
    body: { ticketId, eventId },
    cookie: checkerCookie,
  });

  if (!checkinResponse.ok) {
    fail(
      `POST /api/checkin returned ${checkinResponse.status}: ${JSON.stringify(checkinResponse.body)}`,
    );
  }

  const checkinData = checkinResponse.body.data;
  log(
    `Check-in approved: ticketId=${checkinData?.ticketId}, ` +
      `validatedAt=${checkinData?.validatedAt}`,
  );

  // Step 2: Attempt duplicate check-in — expect 422 Conflict
  const dupResponse = await apiCall<CheckinPayload>("/api/checkin", {
    method: "POST",
    body: { ticketId, eventId },
    cookie: checkerCookie,
  });

  if (dupResponse.status !== 422 && dupResponse.status !== 409) {
    fail(
      `Duplicate check-in should return 422/409 but got ${dupResponse.status}. ` +
        `Ticket may have been already used before this test ran.`,
    );
  }

  log(`Duplicate check-in correctly rejected with ${dupResponse.status}.`);
  log("checkin-flow PASS.");
}

run().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
