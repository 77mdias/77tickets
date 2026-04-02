import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class ResendMock {
    emails = {
      send: mocks.sendEmail,
    };

    constructor() {}
  },
}));

describe("createResendEmailProvider", () => {
  beforeEach(() => {
    mocks.sendEmail.mockReset();
  });

  test("retries up to 3 attempts with exponential backoff before giving up", async () => {
    const { createResendEmailProvider } = await import(
      "../../../../src/server/email/resend.email-provider"
    );

    const sleep = vi.fn(async () => undefined);
    const logger = {
      warn: vi.fn(),
      error: vi.fn(),
    };

    mocks.sendEmail.mockRejectedValue(new Error("temporary_resend_failure"));

    const provider = createResendEmailProvider({
      apiKey: "re_test_123",
      fromEmail: "tickets@77ticket.test",
      sleep,
      logger,
    });

    await expect(
      provider.sendEventReminder({
        recipientEmail: "customer@77ticket.test",
        order: {
          id: "ord_001",
          customerId: "cus_001",
          eventId: "evt_001",
          status: "paid",
          subtotalInCents: 10000,
          discountInCents: 0,
          totalInCents: 10000,
          createdAt: new Date("2026-04-02T12:00:00.000Z"),
          couponId: null,
        },
        event: {
          id: "evt_001",
          organizerId: "org_001",
          slug: "show-001",
          title: "Reminder Event",
          description: null,
          location: "Sao Paulo",
          imageUrl: null,
          status: "published",
          startsAt: new Date("2026-04-03T12:00:00.000Z"),
          endsAt: null,
        },
      }),
    ).resolves.toBeUndefined();

    expect(mocks.sendEmail).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 1000);
    expect(sleep).toHaveBeenNthCalledWith(2, 2000);
    expect(sleep).toHaveBeenNthCalledWith(3, 4000);
    expect(logger.error).toHaveBeenCalled();
  });

  test("acts as no-op when API key or sender email is missing", async () => {
    const { createResendEmailProvider } = await import(
      "../../../../src/server/email/resend.email-provider"
    );

    const logger = {
      warn: vi.fn(),
      error: vi.fn(),
    };

    const provider = createResendEmailProvider({
      apiKey: "",
      fromEmail: "",
      logger,
    });

    await provider.sendOrderConfirmation({
      recipientEmail: "customer@77ticket.test",
      order: {
        id: "ord_001",
        customerId: "cus_001",
        eventId: "evt_001",
        status: "paid",
        subtotalInCents: 10000,
        discountInCents: 0,
        totalInCents: 10000,
        createdAt: new Date("2026-04-02T12:00:00.000Z"),
        couponId: null,
      },
      event: {
        id: "evt_001",
        organizerId: "org_001",
        slug: "show-001",
        title: "Order Event",
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
          qrDataUrl: "data:image/png;base64,abc",
        },
      ],
    });

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});
