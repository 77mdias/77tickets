import { createListEventsHandler } from "@/src/server/api/events/list-events.handler";
import { createListEventsRouteAdapter } from "@/src/server/api/events/public-events.route-adapter";
import { getDatabaseUrlOrThrow } from "@/src/server/api/orders/create-order.route-adapter";
import { createListPublishedEventsUseCase } from "@/src/server/application/use-cases";
import { createDb } from "@/src/server/infrastructure/db/client";
import { DrizzleEventRepository } from "@/src/server/repositories/drizzle";

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
