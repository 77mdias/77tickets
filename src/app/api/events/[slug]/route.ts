import { createGetEventHandler } from "@/server/api/events/get-event.handler";
import { createGetEventRouteAdapter } from "@/server/api/events/public-events.route-adapter";
import { getDatabaseUrlOrThrow } from "@/server/api/orders/create-order.route-adapter";
import { createGetEventDetailUseCase } from "@/server/application/use-cases";
import { createDb } from "@/server/infrastructure/db/client";
import { DrizzleEventRepository, DrizzleLotRepository } from "@/server/repositories/drizzle";

type GetEventBySlugRouteHandler = (
  request: Request,
  context: { params: Promise<{ slug: string }> },
) => Promise<Response>;

let cachedGetEventBySlugRouteHandler: GetEventBySlugRouteHandler | null = null;

const buildGetEventBySlugRouteHandler = (): GetEventBySlugRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const eventRepository = new DrizzleEventRepository(db);
  const lotRepository = new DrizzleLotRepository(db);

  const handleGetEvent = createGetEventHandler({
    getEventDetail: createGetEventDetailUseCase({
      now: () => new Date(),
      eventRepository,
      lotRepository,
    }),
  });

  return createGetEventRouteAdapter({
    handleGetEvent,
  });
};

const getGetEventBySlugRouteHandler = (): GetEventBySlugRouteHandler => {
  if (!cachedGetEventBySlugRouteHandler) {
    cachedGetEventBySlugRouteHandler = buildGetEventBySlugRouteHandler();
  }

  return cachedGetEventBySlugRouteHandler;
};

export const GET = async (
  request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> => getGetEventBySlugRouteHandler()(request, context);
