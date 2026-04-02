/**
 * Smoke script: admin-flow
 *
 * Prerequisites:
 *   - Server running at SMOKE_BASE_URL (default: http://localhost:3000)
 *   - SMOKE_ADMIN_COOKIE: session cookie for a user with admin role
 *
 * Exit 0: flow succeeded
 * Exit 1: flow failed (with descriptive message)
 */

import { apiCall, checkServer, fail, log, BASE_URL } from "./helpers/http";

interface EventCreatePayload {
  data?: {
    event?: { id: string; slug: string; title: string; status: string };
  };
  error?: { code?: string; message?: string };
}

interface PublicEventsPayload {
  data?: {
    events?: Array<{ id: string; slug: string; title: string }>;
  };
}

async function run(): Promise<void> {
  log(`Starting admin-flow against ${BASE_URL}`);

  await checkServer();
  log("Server reachable.");

  const adminCookie = process.env.SMOKE_ADMIN_COOKIE;
  if (!adminCookie) {
    log(
      "SMOKE_ADMIN_COOKIE not set — skipping authenticated admin operations. " +
        "Set it to a valid admin session cookie to exercise the admin flow.",
    );
    log("admin-flow SKIP (missing SMOKE_ADMIN_COOKIE).");
    return;
  }

  const eventTitle = `Smoke Test Event ${Date.now()}`;
  const startsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Step 1: Create event
  const createResponse = await apiCall<EventCreatePayload>("/api/events", {
    method: "POST",
    body: {
      title: eventTitle,
      description: "Smoke test event created by admin-flow script.",
      location: "Online",
      startsAt,
      endsAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
      category: "tech",
    },
    cookie: adminCookie,
  });

  if (!createResponse.ok) {
    fail(
      `POST /api/events returned ${createResponse.status}: ${JSON.stringify(createResponse.body)}`,
    );
  }

  const createdEvent = createResponse.body.data?.event;
  if (!createdEvent?.id) {
    fail("Event created but no event ID in response.");
  }

  log(`Event created: "${createdEvent!.title}" (${createdEvent!.id}), status: ${createdEvent!.status}`);

  // Step 2: Publish event
  const publishResponse = await apiCall<EventCreatePayload>("/api/events/publish", {
    method: "POST",
    body: { eventId: createdEvent!.id },
    cookie: adminCookie,
  });

  if (!publishResponse.ok) {
    fail(
      `POST /api/events/publish returned ${publishResponse.status}: ${JSON.stringify(publishResponse.body)}`,
    );
  }

  log(`Event published: ${createdEvent!.id}`);

  // Step 3: Verify event appears in public listing
  const listResponse = await apiCall<PublicEventsPayload>("/api/events?limit=20");
  if (!listResponse.ok) {
    fail(`GET /api/events returned ${listResponse.status}`);
  }

  const publicEvents = listResponse.body.data?.events ?? [];
  const found = publicEvents.some((e) => e.id === createdEvent!.id);

  if (!found) {
    fail(
      `Published event ${createdEvent!.id} not found in public listing. ` +
        "It may take a moment or the listing may be paginated.",
    );
  }

  log(`Event "${eventTitle}" verified in public listing.`);
  log("admin-flow PASS.");
}

run().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
