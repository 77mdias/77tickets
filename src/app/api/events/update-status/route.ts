import { createUpdateEventRouteAdapter } from "@/src/server/api/events/events.route-adapter";
import { createUpdateEventHandler } from "@/src/server/api/events/update-event.handler";
import { getDatabaseUrlOrThrow } from "@/src/server/api/orders/create-order.route-adapter";
import { createUpdateEventStatusUseCase } from "@/src/server/application/use-cases";
import { createDb } from "@/src/server/infrastructure/db/client";
import { DrizzleEventRepository } from "@/src/server/repositories/drizzle";

type PostUpdateStatusRouteHandler = (request: Request) => Promise<Response>;

let cachedPostUpdateStatusRouteHandler: PostUpdateStatusRouteHandler | null = null;

const buildPostUpdateStatusRouteHandler = (): PostUpdateStatusRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const eventRepository = new DrizzleEventRepository(db);

  const handleUpdateEvent = createUpdateEventHandler({
    eventRepository,
    createUpdateEventStatusForOrganizer: () =>
      createUpdateEventStatusUseCase({
        eventRepository,
      }),
  });

  return createUpdateEventRouteAdapter({
    handleUpdateEvent,
  });
};

const getPostUpdateStatusRouteHandler = (): PostUpdateStatusRouteHandler => {
  if (!cachedPostUpdateStatusRouteHandler) {
    cachedPostUpdateStatusRouteHandler = buildPostUpdateStatusRouteHandler();
  }

  return cachedPostUpdateStatusRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostUpdateStatusRouteHandler()(request);
