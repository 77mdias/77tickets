import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listStartingBetween: vi.fn(),
  sendEventReminder: vi.fn(),
}));

vi.mock("@/server/infrastructure/db/client", () => ({
  createDb: () => ({}) as Record<string, never>,
}));

vi.mock("@/server/api/orders/create-order.route-adapter", () => ({
  getDatabaseUrlOrThrow: () => "postgresql://stub",
}));

vi.mock("@/server/repositories/drizzle", () => ({
  DrizzleEventRepository: class {
    listStartingBetween = mocks.listStartingBetween;
  },
  DrizzleOrderRepository: class {},
  DrizzleUserRepository: class {},
}));

vi.mock("@/server/application/use-cases", () => ({
  createSendEventReminderEmailUseCase: () => mocks.sendEventReminder,
}));

vi.mock("@/server/email", () => ({
  createResendEmailProvider: () => ({
    sendOrderConfirmation: vi.fn(),
    sendEventReminder: vi.fn(),
  }),
}));

describe("POST /api/cron/event-reminders", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.listStartingBetween.mockReset();
    mocks.sendEventReminder.mockReset();
    process.env.CRON_SECRET = "cron-secret";
  });

  test("returns 401 without valid CRON_SECRET bearer token", async () => {
    const importedModule = await import(
      "../../../../../src/app/api/cron/event-reminders/route"
    );

    const post = (importedModule as {
      POST: (request: Request) => Promise<Response>;
    }).POST;

    const response = await post(
      new Request("https://example.test/api/cron/event-reminders", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.sendEventReminder).not.toHaveBeenCalled();
  });

  test("returns processed=0 when no eligible events are found", async () => {
    const importedModule = await import(
      "../../../../../src/app/api/cron/event-reminders/route"
    );

    const post = (importedModule as {
      POST: (request: Request) => Promise<Response>;
    }).POST;

    mocks.listStartingBetween.mockResolvedValue([]);

    const response = await post(
      new Request("https://example.test/api/cron/event-reminders", {
        method: "POST",
        headers: {
          Authorization: "Bearer cron-secret",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 0 });
    expect(mocks.sendEventReminder).not.toHaveBeenCalled();
  });

  test("dispatches reminder use-case for each eligible event and returns processed count", async () => {
    const importedModule = await import(
      "../../../../../src/app/api/cron/event-reminders/route"
    );

    const post = (importedModule as {
      POST: (request: Request) => Promise<Response>;
    }).POST;

    mocks.listStartingBetween.mockResolvedValue([
      {
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
      {
        id: "evt_002",
        organizerId: "org_001",
        slug: "show-002",
        title: "Show 002",
        description: null,
        location: "Rio de Janeiro",
        imageUrl: null,
        status: "published",
        startsAt: new Date("2026-04-03T13:00:00.000Z"),
        endsAt: null,
      },
    ]);

    mocks.sendEventReminder.mockResolvedValue({ processed: 1 });

    const response = await post(
      new Request("https://example.test/api/cron/event-reminders", {
        method: "POST",
        headers: {
          Authorization: "Bearer cron-secret",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 2 });
    expect(mocks.sendEventReminder).toHaveBeenCalledTimes(2);
    expect(mocks.sendEventReminder).toHaveBeenNthCalledWith(1, { eventId: "evt_001" });
    expect(mocks.sendEventReminder).toHaveBeenNthCalledWith(2, { eventId: "evt_002" });
  });
});
