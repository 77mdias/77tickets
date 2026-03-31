import { createListEventsHandler } from "@/server/api/events/list-events.handler";
import { createListEventsRouteAdapter } from "@/server/api/events/public-events.route-adapter";
import { getDatabaseUrlOrThrow } from "@/server/api/orders/create-order.route-adapter";
import { createListPublishedEventsUseCase } from "@/server/application/use-cases";
import { createDb } from "@/server/infrastructure/db/client";
import { DrizzleEventRepository } from "@/server/repositories/drizzle";

type GetEventsRouteHandler = (request: Request) => Promise<Response>;

let cachedGetEventsRouteHandler: GetEventsRouteHandler | null = null;

const buildGetEventsRouteHandler = (): GetEventsRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const eventRepository = new DrizzleEventRepository(db);

  const handleListEvents = createListEventsHandler({
    listPublishedEvents: createListPublishedEventsUseCase({
      eventRepository,
    }),
  });

  return createListEventsRouteAdapter({
    handleListEvents,
  });
};

const getGetEventsRouteHandler = (): GetEventsRouteHandler => {
  if (!cachedGetEventsRouteHandler) {
    cachedGetEventsRouteHandler = buildGetEventsRouteHandler();
  }

  return cachedGetEventsRouteHandler;
};

export const GET = async (request: Request): Promise<Response> =>
  getGetEventsRouteHandler()(request);
