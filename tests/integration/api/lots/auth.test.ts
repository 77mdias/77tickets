import { describe, expect, test, vi } from "vitest";

import { createCreateLotHandler } from "../../../../src/server/api/lots/create-lot.handler";
import { createUpdateLotHandler } from "../../../../src/server/api/lots/update-lot.handler";
import { createCreateLotUseCase } from "../../../../src/server/application/use-cases/create-lot.use-case";
import { createUpdateLotUseCase } from "../../../../src/server/application/use-cases/update-lot.use-case";
import type { SecurityActor } from "../../../../src/server/application/security";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const LOT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const ORGANIZER_A = "00000000-0000-0000-0000-000000000001";
const ORGANIZER_B = "00000000-0000-0000-0000-000000000002";

const buildActor = (role: SecurityActor["role"], userId: string): SecurityActor => ({
  role,
  userId,
});

const createEventRepository = (organizerId: string | null = ORGANIZER_A) => ({
  findById: vi.fn(async () => {
    if (organizerId === null) {
      return null;
    }

    return {
      id: EVENT_ID,
      organizerId,
      slug: "lots-auth-event",
      title: "Lots Auth Event",
      status: "draft" as const,
      startsAt: new Date("2027-06-01T10:00:00.000Z"),
      endsAt: null,
    };
  }),
});

const createLotRepository = () => ({
  findById: vi.fn(async () => ({
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "Lote Basico",
    priceInCents: 5000,
    totalQuantity: 100,
    availableQuantity: 80,
    maxPerOrder: 5,
    saleStartsAt: new Date("2027-01-01T00:00:00.000Z"),
    saleEndsAt: null,
    status: "active" as const,
  })),
  save: vi.fn(async () => undefined),
});

const validCreateLotBody = {
  eventId: EVENT_ID,
  title: "Lote Basico",
  priceInCents: 5000,
  totalQuantity: 100,
  maxPerOrder: 5,
  saleStartsAt: "2027-01-01T00:00:00.000Z",
  saleEndsAt: "2027-05-01T00:00:00.000Z",
};

const validUpdateLotBody = {
  lotId: LOT_ID,
  title: "Lote Atualizado",
  priceInCents: 7000,
  totalQuantity: 120,
  maxPerOrder: 10,
  saleStartsAt: "2027-01-01T00:00:00.000Z",
  saleEndsAt: "2027-05-01T00:00:00.000Z",
  status: "active" as const,
};

describe("lots auth integration", () => {
  test("create-lot blocks customer role", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const lotRepository = createLotRepository();

    const useCase = createCreateLotUseCase({
      generateLotId: () => LOT_ID,
      eventRepository,
      lotRepository,
    });

    const handler = createCreateLotHandler({ createLot: useCase });

    const response = await handler({
      actor: buildActor("customer", "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5"),
      body: validCreateLotBody,
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(lotRepository.save).not.toHaveBeenCalled();
  });

  test("create-lot blocks checker role", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const lotRepository = createLotRepository();

    const useCase = createCreateLotUseCase({
      generateLotId: () => LOT_ID,
      eventRepository,
      lotRepository,
    });

    const handler = createCreateLotHandler({ createLot: useCase });

    const response = await handler({
      actor: buildActor("checker", "00000000-0000-0000-0000-000000000011"),
      body: validCreateLotBody,
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(lotRepository.save).not.toHaveBeenCalled();
  });

  test("create-lot blocks organizer outside ownership scope", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const lotRepository = createLotRepository();

    const useCase = createCreateLotUseCase({
      generateLotId: () => LOT_ID,
      eventRepository,
      lotRepository,
    });

    const handler = createCreateLotHandler({ createLot: useCase });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_B),
      body: validCreateLotBody,
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(lotRepository.save).not.toHaveBeenCalled();
  });

  test("create-lot allows organizer within ownership scope", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const lotRepository = createLotRepository();

    const useCase = createCreateLotUseCase({
      generateLotId: () => LOT_ID,
      eventRepository,
      lotRepository,
    });

    const handler = createCreateLotHandler({ createLot: useCase });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_A),
      body: validCreateLotBody,
    });

    expect(response.status).toBe(201);
    expect(lotRepository.save).toHaveBeenCalled();
  });

  test("create-lot allows admin globally", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const lotRepository = createLotRepository();

    const useCase = createCreateLotUseCase({
      generateLotId: () => LOT_ID,
      eventRepository,
      lotRepository,
    });

    const handler = createCreateLotHandler({ createLot: useCase });

    const response = await handler({
      actor: buildActor("admin", "00000000-0000-0000-0000-000000000099"),
      body: validCreateLotBody,
    });

    expect(response.status).toBe(201);
    expect(lotRepository.save).toHaveBeenCalled();
  });

  test("update-lot blocks customer role", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const lotRepository = createLotRepository();

    const useCase = createUpdateLotUseCase({
      eventRepository,
      lotRepository,
    });

    const handler = createUpdateLotHandler({ updateLot: useCase });

    const response = await handler({
      actor: buildActor("customer", "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5"),
      body: validUpdateLotBody,
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(lotRepository.save).not.toHaveBeenCalled();
  });

  test("update-lot blocks checker role", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const lotRepository = createLotRepository();

    const useCase = createUpdateLotUseCase({
      eventRepository,
      lotRepository,
    });

    const handler = createUpdateLotHandler({ updateLot: useCase });

    const response = await handler({
      actor: buildActor("checker", "00000000-0000-0000-0000-000000000011"),
      body: validUpdateLotBody,
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(lotRepository.save).not.toHaveBeenCalled();
  });

  test("update-lot blocks organizer outside ownership scope", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const lotRepository = createLotRepository();

    const useCase = createUpdateLotUseCase({
      eventRepository,
      lotRepository,
    });

    const handler = createUpdateLotHandler({ updateLot: useCase });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_B),
      body: validUpdateLotBody,
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
    expect(lotRepository.save).not.toHaveBeenCalled();
  });

  test("update-lot allows organizer within ownership scope", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const lotRepository = createLotRepository();

    const useCase = createUpdateLotUseCase({
      eventRepository,
      lotRepository,
    });

    const handler = createUpdateLotHandler({ updateLot: useCase });

    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_A),
      body: validUpdateLotBody,
    });

    expect(response.status).toBe(200);
    expect(lotRepository.save).toHaveBeenCalled();
  });

  test("update-lot allows admin globally", async () => {
    const eventRepository = createEventRepository(ORGANIZER_A);
    const lotRepository = createLotRepository();

    const useCase = createUpdateLotUseCase({
      eventRepository,
      lotRepository,
    });

    const handler = createUpdateLotHandler({ updateLot: useCase });

    const response = await handler({
      actor: buildActor("admin", "00000000-0000-0000-0000-000000000099"),
      body: validUpdateLotBody,
    });

    expect(response.status).toBe(200);
    expect(lotRepository.save).toHaveBeenCalled();
  });
});
