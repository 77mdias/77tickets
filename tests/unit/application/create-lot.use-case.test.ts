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

type CreateLotResult = {
  lotId: string;
  eventId: string;
  status: "active";
  availableQuantity: number;
};

type CreateLotUseCaseFactory = (dependencies: {
  generateLotId: () => string;
  eventRepository: {
    findById: (eventId: string) => Promise<EventRecord | null>;
  };
  lotRepository: {
    save: (lot: LotRecord) => Promise<void>;
  };
}) => (input: {
  eventId: string;
  title: string;
  priceInCents: number;
  totalQuantity: number;
  maxPerOrder: number;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  actor: {
    userId: string;
    role: "organizer" | "admin";
  };
}) => Promise<CreateLotResult>;

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const LOT_ID = "474c0487-e4ef-442f-8061-6fa2d96ba2ee";
const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const OTHER_ORGANIZER_ID = "c12f34a1-c6d3-4fcb-aa6d-8fb7f8fc04d5";

async function loadCreateLotFactory(): Promise<CreateLotUseCaseFactory> {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/create-lot.use-case"
  );

  const createCreateLotUseCase = (
    useCaseModule as { createCreateLotUseCase?: unknown }
  ).createCreateLotUseCase;

  if (typeof createCreateLotUseCase !== "function") {
    throw new Error(
      "LOT-008 RED: expected createCreateLotUseCase to be exported by create-lot.use-case.ts",
    );
  }

  return createCreateLotUseCase as CreateLotUseCaseFactory;
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

test("LOT-008 RED: creates an active lot for the organizer's own event", async () => {
  const createCreateLotUseCase = await loadCreateLotFactory();
  const save = vi.fn(async () => undefined);

  const createLot = createCreateLotUseCase({
    generateLotId: () => LOT_ID,
    eventRepository: {
      findById: vi.fn(async () => makeEvent()),
    },
    lotRepository: {
      save,
    },
  });

  const result = await createLot({
    eventId: EVENT_ID,
    title: "Primeiro Lote",
    priceInCents: 15000,
    totalQuantity: 200,
    maxPerOrder: 4,
    saleStartsAt: new Date("2026-12-01T00:00:00.000Z"),
    saleEndsAt: new Date("2027-01-09T23:59:59.000Z"),
    actor: {
      userId: ORGANIZER_ID,
      role: "organizer",
    },
  });

  expect(save).toHaveBeenCalledWith({
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "Primeiro Lote",
    priceInCents: 15000,
    totalQuantity: 200,
    availableQuantity: 200,
    maxPerOrder: 4,
    saleStartsAt: new Date("2026-12-01T00:00:00.000Z"),
    saleEndsAt: new Date("2027-01-09T23:59:59.000Z"),
    status: "active",
  });
  expect(result).toEqual({
    lotId: LOT_ID,
    eventId: EVENT_ID,
    status: "active",
    availableQuantity: 200,
  });
});

test("LOT-008 RED: allows an admin to create a lot for any event", async () => {
  const createCreateLotUseCase = await loadCreateLotFactory();
  const save = vi.fn(async () => undefined);

  const createLot = createCreateLotUseCase({
    generateLotId: () => LOT_ID,
    eventRepository: {
      findById: vi.fn(async () => makeEvent(OTHER_ORGANIZER_ID)),
    },
    lotRepository: {
      save,
    },
  });

  await createLot({
    eventId: EVENT_ID,
    title: "Lote Admin",
    priceInCents: 18000,
    totalQuantity: 50,
    maxPerOrder: 2,
    saleStartsAt: new Date("2026-12-01T00:00:00.000Z"),
    saleEndsAt: null,
    actor: {
      userId: ORGANIZER_ID,
      role: "admin",
    },
  });

  expect(save).toHaveBeenCalledOnce();
});

test("LOT-008 RED: blocks organizer access for a foreign event", async () => {
  const createCreateLotUseCase = await loadCreateLotFactory();
  const save = vi.fn(async () => undefined);

  const createLot = createCreateLotUseCase({
    generateLotId: () => LOT_ID,
    eventRepository: {
      findById: vi.fn(async () => makeEvent(OTHER_ORGANIZER_ID)),
    },
    lotRepository: {
      save,
    },
  });

  await expect(
    createLot({
      eventId: EVENT_ID,
      title: "Primeiro Lote",
      priceInCents: 15000,
      totalQuantity: 200,
      maxPerOrder: 4,
      saleStartsAt: new Date("2026-12-01T00:00:00.000Z"),
      saleEndsAt: new Date("2027-01-09T23:59:59.000Z"),
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

test("LOT-008 RED: rejects an invalid sale window before saving", async () => {
  const createCreateLotUseCase = await loadCreateLotFactory();
  const save = vi.fn(async () => undefined);

  const createLot = createCreateLotUseCase({
    generateLotId: () => LOT_ID,
    eventRepository: {
      findById: vi.fn(async () => makeEvent()),
    },
    lotRepository: {
      save,
    },
  });

  await expect(
    createLot({
      eventId: EVENT_ID,
      title: "Primeiro Lote",
      priceInCents: 15000,
      totalQuantity: 200,
      maxPerOrder: 4,
      saleStartsAt: new Date("2027-01-10T00:00:00.000Z"),
      saleEndsAt: new Date("2026-12-01T00:00:00.000Z"),
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

test("LOT-008 RED: rejects non-positive stock invariants before saving", async () => {
  const createCreateLotUseCase = await loadCreateLotFactory();
  const save = vi.fn(async () => undefined);

  const createLot = createCreateLotUseCase({
    generateLotId: () => LOT_ID,
    eventRepository: {
      findById: vi.fn(async () => makeEvent()),
    },
    lotRepository: {
      save,
    },
  });

  await expect(
    createLot({
      eventId: EVENT_ID,
      title: "Primeiro Lote",
      priceInCents: 15000,
      totalQuantity: 0,
      maxPerOrder: 0,
      saleStartsAt: new Date("2026-12-01T00:00:00.000Z"),
      saleEndsAt: new Date("2027-01-09T23:59:59.000Z"),
      actor: {
        userId: ORGANIZER_ID,
        role: "organizer",
      },
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "invalid_lot_quantity" },
  });

  expect(save).not.toHaveBeenCalled();
});
