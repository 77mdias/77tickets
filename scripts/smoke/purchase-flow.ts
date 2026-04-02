/**
 * Smoke script: purchase-flow
 *
 * Prerequisites:
 *   - Server running at SMOKE_BASE_URL (default: http://localhost:3000)
 *   - Seed data: at least one published event with an available lot
 *   - Customer session cookie in SMOKE_CUSTOMER_COOKIE env var
 *
 * Exit 0: flow succeeded
 * Exit 1: flow failed (with descriptive message)
 */

import { apiCall, checkServer, fail, log, BASE_URL } from "./helpers/http";

interface EventListPayload {
  data?: {
    events?: Array<{ id: string; slug: string; title: string }>;
  };
}

interface EventDetailPayload {
  data?: {
    event?: { id: string; title: string };
    lots?: Array<{ id: string; title: string; available: number }>;
  };
}

interface OrderPayload {
  data?: {
    orderId?: string;
    checkoutUrl?: string;
  };
}

interface OrderMinePayload {
  data?: {
    orders?: Array<{
      id: string;
      status: string;
      tickets?: Array<{ id: string; token: string; status: string }>;
    }>;
  };
}

async function run(): Promise<void> {
  log(`Starting purchase-flow against ${BASE_URL}`);

  await checkServer();
  log("Server reachable.");

  // Step 1: List published events
  const eventsResponse = await apiCall<EventListPayload>("/api/events?limit=5");
  if (!eventsResponse.ok) {
    fail(`GET /api/events returned ${eventsResponse.status}`);
  }

  const events = eventsResponse.body.data?.events ?? [];
  if (events.length === 0) {
    fail("No published events found. Seed the database with at least one published event.");
  }

  const event = events[0];
  log(`Found event: "${event.title}" (${event.id})`);

  // Step 2: Get event detail with lots
  const detailResponse = await apiCall<EventDetailPayload>(`/api/events/${event.slug}`);
  if (!detailResponse.ok) {
    fail(`GET /api/events/${event.slug} returned ${detailResponse.status}`);
  }

  const lots = detailResponse.body.data?.lots ?? [];
  const availableLot = lots.find((l) => l.available > 0);
  if (!availableLot) {
    fail(`Event "${event.title}" has no available lots.`);
  }

  log(`Found available lot: "${availableLot!.title}" (${availableLot!.id})`);

  // Step 3: Create order (requires customer session)
  const customerCookie = process.env.SMOKE_CUSTOMER_COOKIE;
  if (!customerCookie) {
    log(
      "SMOKE_CUSTOMER_COOKIE not set — skipping authenticated order creation. " +
        "Set it to a valid session cookie to fully exercise the purchase flow.",
    );
    log("purchase-flow PARTIAL PASS (unauthenticated endpoints verified).");
    return;
  }

  const orderResponse = await apiCall<OrderPayload>("/api/orders", {
    method: "POST",
    body: {
      eventId: event.id,
      items: [{ lotId: availableLot!.id, quantity: 1 }],
    },
    cookie: customerCookie,
  });

  if (!orderResponse.ok) {
    fail(`POST /api/orders returned ${orderResponse.status}: ${JSON.stringify(orderResponse.body)}`);
  }

  const orderId = orderResponse.body.data?.orderId;
  if (!orderId) {
    fail("Order created but orderId not found in response.");
  }

  log(`Order created: ${orderId}`);

  // Step 4: Simulate payment
  const simResponse = await apiCall(`/api/orders/${orderId}/simulate-payment`, {
    method: "POST",
    body: {},
    cookie: customerCookie,
  });

  if (!simResponse.ok) {
    fail(`POST /api/orders/${orderId}/simulate-payment returned ${simResponse.status}`);
  }

  log("Payment simulated.");

  // Step 5: Verify ticket generated
  const mineResponse = await apiCall<OrderMinePayload>("/api/orders/mine", {
    cookie: customerCookie,
  });

  if (!mineResponse.ok) {
    fail(`GET /api/orders/mine returned ${mineResponse.status}`);
  }

  const myOrders = mineResponse.body.data?.orders ?? [];
  const myOrder = myOrders.find((o) => o.id === orderId);
  if (!myOrder) {
    fail(`Order ${orderId} not found in customer orders.`);
  }

  const tickets = myOrder!.tickets ?? [];
  if (tickets.length === 0) {
    fail(`Order ${orderId} has no tickets after payment simulation.`);
  }

  log(`Tickets generated: ${tickets.map((t) => t.id).join(", ")}`);
  log("purchase-flow PASS.");
}

run().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
