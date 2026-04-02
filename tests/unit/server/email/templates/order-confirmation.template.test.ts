import { expect, test } from "vitest";

test("renders order confirmation HTML with event details, ticket QR and /meus-ingressos link", async () => {
  const { renderOrderConfirmationEmail } = await import(
    "../../../../../src/server/email/templates/order-confirmation.template"
  );

  const html = renderOrderConfirmationEmail({
    recipientEmail: "customer@77ticket.test",
    order: {
      id: "ord_001",
      customerId: "cus_001",
      eventId: "evt_001",
      status: "paid",
      subtotalInCents: 20000,
      discountInCents: 1000,
      totalInCents: 19000,
      createdAt: new Date("2026-04-02T12:00:00.000Z"),
      couponId: null,
    },
    event: {
      id: "evt_001",
      organizerId: "org_001",
      slug: "show-001",
      title: "Show 001",
      description: null,
      location: "Sao Paulo",
      imageUrl: null,
      status: "published",
      startsAt: new Date("2026-04-03T12:00:00.000Z"),
      endsAt: null,
    },
    tickets: [
      {
        id: "tkt_001",
        eventId: "evt_001",
        orderId: "ord_001",
        lotId: "lot_001",
        code: "TKT-001",
        status: "active",
        checkedInAt: null,
        qrDataUrl: "data:image/png;base64,ABC123",
      },
    ],
    appBaseUrl: "https://77ticket.test",
  });

  expect(html).toContain("Show 001");
  expect(html).toContain("Sao Paulo");
  expect(html).toContain("data:image/png;base64,ABC123");
  expect(html).toContain("https://77ticket.test/meus-ingressos");
});
