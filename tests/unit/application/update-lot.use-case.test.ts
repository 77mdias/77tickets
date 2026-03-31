import { expect, test, vi } from "vitest";

type EventStatus = "draft" | "published" | "cancelled";
type LotStatus = "active" | "paused" | "sold_out" | "closed";

type EventRecord = {
  id: string;
  organizerId: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  status: EventStatus;
  startsAt: Date;
  endsAt: Date | null;
};

type LotRecord = {
  id: string;
  eventId: string;
  title: string;
  priceInCents: number;
  totalQuantity: number;
  availableQuantity: number;
  maxPerOrder: number;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  status: LotStatus;
};

type UpdateLotResult = {
  lotId: string;
  eventId: string;
  status: LotStatus;
  availableQuantity: number;
  totalQuantity: number;
};

type UpdateLotUseCaseFactory = (dependencies: {
  eventRepository: {
    findById: (eventId: string) => Promise<EventRecord | null>;
  };
  lotRepository: {
    findById: (lotId: string) => Promise<LotRecord | null>;
    save: (lot: LotRecord) => Promise<void>;
  };
}) => (input: {
  lotId: string;
  title?: string;
  priceInCents?: number;
  totalQuantity?: number;
  maxPerOrder?: number;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
  status?: LotStatus;
  actor: {
    userId: string;
    role: "organizer" | "admin";
  };
}) => Promise<UpdateLotResult>;

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const LOT_ID = "474c0487-e4ef-442f-8061-6fa2d96ba2ee";
const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const OTHER_ORGANIZER_ID = "c12f34a1-c6d3-4fcb-aa6d-8fb7f8fc04d5";

async function loadUpdateLotFactory(): Promise<UpdateLotUseCaseFactory> {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/update-lot.use-case"
  );

  const createUpdateLotUseCase = (
    useCaseModule as { createUpdateLotUseCase?: unknown }
  ).createUpdateLotUseCase;

  if (typeof createUpdateLotUseCase !== "function") {
    throw new Error(
      "LOT-009 RED: expected createUpdateLotUseCase to be exported by update-lot.use-case.ts",
    );
  }

  return createUpdateLotUseCase as UpdateLotUseCaseFactory;
}

const makeEvent = (organizerId = ORGANIZER_ID): EventRecord => ({
  id: EVENT_ID,
  organizerId,
  slug: "festival-de-verao-2027",
  title: "Festival de Verao 2027",
  description: null,
  location: null,
  imageUrl: null,
  status: "draft",
  startsAt: new Date("2027-01-10T18:00:00.000Z"),
  endsAt: null,
});

const makeLot = (): LotRecord => ({
  id: LOT_ID,
  eventId: EVENT_ID,
  title: "Primeiro Lote",
  priceInCents: 15000,
  totalQuantity: 100,
  availableQuantity: 40,
  maxPerOrder: 4,
  saleStartsAt: new Date("2026-12-01T00:00:00.000Z"),
  saleEndsAt: new Date("2027-01-09T23:59:59.000Z"),
  status: "active",
});

test("LOT-009 RED: updates only provided lot fields and preserves sold quantity", async () => {
  const createUpdateLotUseCase = await loadUpdateLotFactory();
  const save = vi.fn(async () => undefined);

  const updateLot = createUpdateLotUseCase({
    eventRepository: {
      findById: vi.fn(async () => makeEvent()),
    },
    lotRepository: {
      findById: vi.fn(async () => makeLot()),
      save,
    },
  });

  const result = await updateLot({
    lotId: LOT_ID,
    title: "Lote Virada",
    totalQuantity: 80,
    status: "paused",
    actor: {
      userId: ORGANIZER_ID,
      role: "organizer",
    },
  });

  expect(save).toHaveBeenCalledWith({
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "Lote Virada",
    priceInCents: 15000,
    totalQuantity: 80,
    availableQuantity: 20,
    maxPerOrder: 4,
    saleStartsAt: new Date("2026-12-01T00:00:00.000Z"),
    saleEndsAt: new Date("2027-01-09T23:59:59.000Z"),
    status: "paused",
  });
  expect(result).toEqual({
    lotId: LOT_ID,
    eventId: EVENT_ID,
    status: "paused",
    availableQuantity: 20,
    totalQuantity: 80,
  });
});

test("LOT-009 RED: allows an admin to update a lot for any organizer", async () => {
  const createUpdateLotUseCase = await loadUpdateLotFactory();
  const save = vi.fn(async () => undefined);

  const updateLot = createUpdateLotUseCase({
    eventRepository: {
      findById: vi.fn(async () => makeEvent(OTHER_ORGANIZER_ID)),
    },
    lotRepository: {
      findById: vi.fn(async () => makeLot()),
      save,
    },
  });

  await updateLot({
    lotId: LOT_ID,
    title: "Lote Admin",
    actor: {
      userId: ORGANIZER_ID,
      role: "admin",
    },
  });

  expect(save).toHaveBeenCalledOnce();
});

test("LOT-009 RED: blocks organizer updates for a foreign event", async () => {
  const createUpdateLotUseCase = await loadUpdateLotFactory();
  const save = vi.fn(async () => undefined);

  const updateLot = createUpdateLotUseCase({
    eventRepository: {
      findById: vi.fn(async () => makeEvent(OTHER_ORGANIZER_ID)),
    },
    lotRepository: {
      findById: vi.fn(async () => makeLot()),
      save,
    },
  });

  await expect(
    updateLot({
      lotId: LOT_ID,
      title: "Lote Bloqueado",
      actor: {
        userId: ORGANIZER_ID,
        role: "organizer",
      },
    }),
  ).rejects.toMatchObject({
    code: "authorization",
  });

  expect(save).not.toHaveBeenCalled();
});

test("LOT-009 RED: rejects lowering totalQuantity below already sold quantity", async () => {
  const createUpdateLotUseCase = await loadUpdateLotFactory();
  const save = vi.fn(async () => undefined);

  const updateLot = createUpdateLotUseCase({
    eventRepository: {
      findById: vi.fn(async () => makeEvent()),
    },
    lotRepository: {
      findById: vi.fn(async () => makeLot()),
      save,
    },
  });

  await expect(
    updateLot({
      lotId: LOT_ID,
      totalQuantity: 59,
      actor: {
        userId: ORGANIZER_ID,
        role: "organizer",
      },
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "total_quantity_below_sold_quantity" },
  });

  expect(save).not.toHaveBeenCalled();
});

test("LOT-009 RED: rejects updates that produce an invalid sale window", async () => {
  const createUpdateLotUseCase = await loadUpdateLotFactory();
  const save = vi.fn(async () => undefined);

  const updateLot = createUpdateLotUseCase({
    eventRepository: {
      findById: vi.fn(async () => makeEvent()),
    },
    lotRepository: {
      findById: vi.fn(async () => makeLot()),
      save,
    },
  });

  await expect(
    updateLot({
      lotId: LOT_ID,
      saleStartsAt: new Date("2027-02-01T00:00:00.000Z"),
      actor: {
        userId: ORGANIZER_ID,
        role: "organizer",
      },
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "invalid_sale_window" },
  });

  expect(save).not.toHaveBeenCalled();
});
