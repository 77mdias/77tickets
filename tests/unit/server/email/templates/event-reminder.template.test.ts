import { expect, test } from "vitest";

test("renders event reminder HTML with event details and /meus-ingressos CTA", async () => {
  const { renderEventReminderEmail } = await import(
    "../../../../../src/server/email/templates/event-reminder.template"
  );

  const html = renderEventReminderEmail({
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
    appBaseUrl: "https://77ticket.test",
  });

  expect(html).toContain("Show 001");
  expect(html).toContain("Sao Paulo");
  expect(html).toContain("https://77ticket.test/meus-ingressos");
});
