import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findOrderById: vi.fn(),
  simulatePayment: vi.fn(),
}));

vi.mock("@/server/infrastructure/auth", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/server/infrastructure/db/client", () => ({
  createDb: () => ({}) as Record<string, never>,
}));

vi.mock("@/server/api/orders/create-order.route-adapter", () => ({
  getDatabaseUrlOrThrow: () => "postgresql://stub",
}));

vi.mock("@/server/repositories/drizzle", () => ({
  DrizzleOrderRepository: class {
    findById = mocks.findOrderById;
  },
  DrizzleTicketRepository: class {},
  DrizzleCouponRepository: class {},
}));

vi.mock("@/server/application/use-cases", () => ({
  createConfirmOrderPaymentUseCase: () => vi.fn(),
  createSimulatePaymentUseCase: () => mocks.simulatePayment,
}));

describe("POST /api/orders/[id]/simulate-payment", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getSession.mockReset();
    mocks.findOrderById.mockReset();
    mocks.simulatePayment.mockReset();

    mocks.getSession.mockResolvedValue({
      userId: "cus_sim_001",
      role: "customer",
    });
    mocks.findOrderById.mockResolvedValue({
      order: {
        id: "ord_sim_001",
        customerId: "cus_sim_001",
        eventId: "evt_sim_001",
        status: "pending",
        subtotalInCents: 10000,
        discountInCents: 0,
        totalInCents: 10000,
        createdAt: new Date("2026-04-01T12:00:00.000Z"),
        couponId: null,
      },
      items: [{ lotId: "lot_sim_001", quantity: 1, unitPriceInCents: 10000 }],
    });
    mocks.simulatePayment.mockResolvedValue({ outcome: "confirmed" });
  });

  test("confirms simulation for the order owner", async () => {
    const importedModule = await import(
      "../../../../../src/app/api/orders/[id]/simulate-payment/route"
    );
    const post = (importedModule as {
      POST: (request: Request, context: { params: { id: string } }) => Promise<Response>;
    }).POST;

    const response = await post(
      new Request("https://example.test/api/orders/ord_sim_001/simulate-payment", {
        method: "POST",
      }),
      { params: { id: "ord_sim_001" } },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { outcome: "confirmed" },
    });
    expect(mocks.simulatePayment).toHaveBeenCalledWith({ orderId: "ord_sim_001" });
  });

  test("blocks customers from simulating payments for another customer order", async () => {
    mocks.findOrderById.mockResolvedValueOnce({
      order: {
        id: "ord_sim_002",
        customerId: "cus_other_001",
        eventId: "evt_sim_001",
        status: "pending",
        subtotalInCents: 10000,
        discountInCents: 0,
        totalInCents: 10000,
        createdAt: new Date("2026-04-01T12:00:00.000Z"),
        couponId: null,
      },
      items: [{ lotId: "lot_sim_001", quantity: 1, unitPriceInCents: 10000 }],
    });

    const importedModule = await import(
      "../../../../../src/app/api/orders/[id]/simulate-payment/route"
    );
    const post = (importedModule as {
      POST: (request: Request, context: { params: { id: string } }) => Promise<Response>;
    }).POST;

    const response = await post(
      new Request("https://example.test/api/orders/ord_sim_002/simulate-payment", {
        method: "POST",
      }),
      { params: { id: "ord_sim_002" } },
    );

    expect(response.status).toBe(403);
    expect(mocks.simulatePayment).not.toHaveBeenCalled();
  });
});
