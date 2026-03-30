import { expect, test, vi } from "vitest";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";

test("EVT-007 RED: returns published event detail with lot availability projection", async () => {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/get-event-detail.use-case"
  );
  const createGetEventDetailUseCase = useCaseModule.createGetEventDetailUseCase;

  const useCase = createGetEventDetailUseCase({
    now: () => new Date("2026-05-10T12:00:00.000Z"),
    eventRepository: {
      findPublishedBySlug: vi.fn(async () => ({
        id: EVENT_ID,
        organizerId: "00000000-0000-0000-0000-000000000001",
        slug: "evento-publico",
        title: "Evento Publico",
        description: "Descricao",
        location: "Sao Paulo",
        imageUrl: "https://cdn.example.com/public.png",
        status: "published" as const,
        startsAt: new Date("2026-05-20T18:00:00.000Z"),
        endsAt: new Date("2026-05-20T22:00:00.000Z"),
      })),
    },
    lotRepository: {
      findByEventId: vi.fn(async () => [
        {
          id: "lot-active",
          eventId: EVENT_ID,
          title: "Lote Ativo",
          priceInCents: 10000,
          totalQuantity: 100,
          availableQuantity: 20,
          maxPerOrder: 4,
          saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
          saleEndsAt: new Date("2026-05-19T23:59:59.000Z"),
          status: "active" as const,
        },
        {
          id: "lot-window-closed",
          eventId: EVENT_ID,
          title: "Lote Fora Janela",
          priceInCents: 12000,
          totalQuantity: 100,
          availableQuantity: 15,
          maxPerOrder: 4,
          saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
          saleEndsAt: new Date("2026-01-10T23:59:59.000Z"),
          status: "active" as const,
        },
        {
          id: "lot-sold-out",
          eventId: EVENT_ID,
          title: "Lote Esgotado",
          priceInCents: 15000,
          totalQuantity: 100,
          availableQuantity: 0,
          maxPerOrder: 4,
          saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
          saleEndsAt: new Date("2026-05-19T23:59:59.000Z"),
          status: "active" as const,
        },
      ]),
    },
  });

  const result = await useCase({ slug: "evento-publico" });

  expect(result.event.slug).toBe("evento-publico");
  expect(result.lots).toEqual([
    expect.objectContaining({ id: "lot-active", available: 20 }),
    expect.objectContaining({ id: "lot-window-closed", available: 0 }),
    expect.objectContaining({ id: "lot-sold-out", available: 0 }),
  ]);
});

test("EVT-007 RED: returns not-found for missing or non-published event slug", async () => {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/get-event-detail.use-case"
  );
  const createGetEventDetailUseCase = useCaseModule.createGetEventDetailUseCase;

  const useCase = createGetEventDetailUseCase({
    now: () => new Date("2026-05-10T12:00:00.000Z"),
    eventRepository: {
      findPublishedBySlug: vi.fn(async () => null),
    },
    lotRepository: {
      findByEventId: vi.fn(async () => []),
    },
  });

  await expect(useCase({ slug: "inexistente" })).rejects.toMatchObject({
    code: "not-found",
  });
});
